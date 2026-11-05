"""Genera lo script SQL che importa i turni dei collaboratori esportati da Fresha.

Uso:
    python scripts/fresha_shifts_to_sql.py data/fresha_scheduled-shifts.csv data/import_turni.sql

Il CSV è il report Fresha "Turni programmati" > Opzioni > CSV.

L'SQL si esegue con psql o DBeaver dopo gli altri import ed è ripetibile: cancella turni e settimane tipo e li
reinserisce. Solo per i collaboratori già presenti in `staff` (confronto sul nome di battesimo, come per lo storico):
gli altri nomi del report (account non legati a un collaboratore) si saltano.

Settimana tipo (`staff_week_pattern`): per ogni collaboratore e giorno, l'orario più frequente, solo se compare in
almeno 4 settimane e in almeno 2 turni su 3 di quel giorno; altrimenti quel giorno si lascia vuoto.
"""

import csv
import sys
from collections import Counter, defaultdict
from datetime import datetime

MIN_WEEKS = 4


def sql(value):
    return "NULL" if value is None else "'" + str(value).replace("'", "''") + "'"


def when(text):
    return datetime.strptime(text.strip(), "%d %b %Y, %I:%M%p")


def main(csv_path, sql_path):
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        shifts = [(r["Membro del team"].strip(), when(r["Inizio previsto"]), when(r["Fine prevista"]))
                  for r in csv.DictReader(f)]

    by_day = defaultdict(Counter)
    for name, start, end in shifts:
        by_day[(name, start.isoweekday())][(start.hour * 60 + start.minute, end.hour * 60 + end.minute)] += 1
    patterns = []
    for (name, weekday), times in sorted(by_day.items()):
        (start, end), n = times.most_common(1)[0]
        if n >= MIN_WEEKS and n * 3 >= sum(times.values()) * 2:
            patterns.append((name, weekday, start, end))

    match = "lower(m.full_name) = lower(s.first_name) OR lower(m.full_name) LIKE lower(s.first_name) || ' %'"
    names = sorted({s[0] for s in shifts})
    out = [f"-- Import turni Fresha: {len(shifts)} turni, generato da fresha_shifts_to_sql.py",
           "SET client_encoding = 'UTF8';",
           "BEGIN;",
           "",
           "DELETE FROM staff_shift; DELETE FROM staff_week_pattern;",
           "",
           "CREATE TEMP TABLE imp_staff (full_name text PRIMARY KEY, staff_id uuid);",
           "INSERT INTO imp_staff (full_name) VALUES " + ", ".join(f"({sql(n)})" for n in names) + ";",
           f"UPDATE imp_staff m SET staff_id = (SELECT s.id FROM staff s WHERE {match} "
           f"ORDER BY s.deleted_at NULLS FIRST, length(s.first_name) DESC LIMIT 1);",
           "",
           "CREATE TEMP TABLE imp_shift (full_name text, starts timestamp, ends timestamp);",
           "INSERT INTO imp_shift VALUES\n" + ",\n".join(
               f"({sql(n)}, {sql(a.strftime('%Y-%m-%d %H:%M'))}, {sql(b.strftime('%Y-%m-%d %H:%M'))})"
               for n, a, b in shifts) + ";",
           "INSERT INTO staff_shift (staff_id, starts_at, ends_at) SELECT m.staff_id, "
           "i.starts AT TIME ZONE 'Europe/London', i.ends AT TIME ZONE 'Europe/London' "
           "FROM imp_shift i JOIN imp_staff m ON m.full_name = i.full_name WHERE m.staff_id IS NOT NULL;",
           ""]
    if patterns:
        out += ["CREATE TEMP TABLE imp_pattern (full_name text, weekday smallint, starts int, ends int);",
                "INSERT INTO imp_pattern VALUES\n" + ",\n".join(
                    f"({sql(n)}, {d}, {a}, {b})" for n, d, a, b in patterns) + ";",
                "INSERT INTO staff_week_pattern (staff_id, weekday, starts_minute, ends_minute) "
                "SELECT m.staff_id, p.weekday, p.starts, p.ends FROM imp_pattern p "
                "JOIN imp_staff m ON m.full_name = p.full_name WHERE m.staff_id IS NOT NULL;"]
    out += ["", "COMMIT;", ""]
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"{len(shifts)} turni di {len(names)} nomi; settimana tipo: {len(patterns)} giorni")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
