"""Genera lo script SQL che importa le recensioni esportate da Fresha.

Uso:
    python scripts/fresha_reviews_to_sql.py data/recensioni_fresha.json data/import_recensioni.sql

Il JSON è l'elenco estratto dalla pagina "Reputazione online" del partner Fresha, una voce per recensione:
    {"name": "Sarah Little", "rating": 5, "date": "2026-11-04 22:45",
     "service": "Haircut/blow dry con Roberta  • Morresi Hair Stylist", "text": "..."}
(date = ora locale di Londra).

L'SQL si esegue con DBeaver o psql sul database dell'applicazione ed è ripetibile: prima cancella le recensioni con
source = 'FRESHA' (i voti ai collaboratori si cancellano a cascata) e poi le reinserisce. I collaboratori citati che
non esistono ancora in `staff` vengono creati con il solo nome; il confronto è sul nome, senza maiuscole.
"""

import json
import re
import sys

SALON_SUFFIX = re.compile(r"\s*•.*$")


def sql(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def staff_names(service_line):
    """'Haircut/blow dry con Roberta  • Morresi Hair Stylist' -> ['Roberta']"""
    line = SALON_SUFFIX.sub("", service_line)
    if " con " not in line:
        return []
    names = line.rsplit(" con ", 1)[1]
    if re.fullmatch(r"\d+ professionisti", names):   # Fresha non dice chi: niente voto ai collaboratori
        return []
    return [n.strip() for n in re.split(r",| e | and |&", names) if n.strip()]


def main(json_path, sql_path):
    with open(json_path, encoding="utf-8") as f:
        reviews = json.load(f)

    all_staff = sorted({n for r in reviews for n in staff_names(r["service"])}, key=str.lower)

    out = ["-- Import recensioni Fresha: " + str(len(reviews)) + " recensioni, generato da fresha_reviews_to_sql.py",
           "SET client_encoding = 'UTF8';",
           "BEGIN;",
           "",
           "DELETE FROM review WHERE source = 'FRESHA';",
           "",
           "-- Collaboratori citati nelle recensioni e non ancora presenti"]
    for name in all_staff:
        out.append(f"INSERT INTO staff (first_name, display_name) SELECT {sql(name)}, {sql(name)} "
                   f"WHERE NOT EXISTS (SELECT 1 FROM staff WHERE lower(first_name) = lower({sql(name)}));")
    out.append("")

    for r in reviews:
        created = f"({sql(r['date'])}::timestamp AT TIME ZONE 'Europe/London')"
        comment = r["text"].strip() or None
        review = (f"INSERT INTO review (source, author_name, rating, comment, published, created_at, updated_at) "
                  f"VALUES ('FRESHA', {sql(r['name'])}, {r['rating']}, {sql(comment)}, true, {created}, {created})")
        names = staff_names(r["service"])
        if not names:
            out.append(review + ";")
            continue
        review += " RETURNING id"
        ratings = " UNION ALL ".join(
            f"SELECT r.id, (SELECT id FROM staff WHERE lower(first_name) = lower({sql(n)}) "
            f"ORDER BY deleted_at NULLS FIRST LIMIT 1), {r['rating']} FROM r"
            for n in names)
        out.append(f"WITH r AS ({review}) INSERT INTO review_staff_rating (review_id, staff_id, rating) {ratings};")

    out += ["", "COMMIT;", ""]
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"{len(reviews)} recensioni, collaboratori: {', '.join(all_staff)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
