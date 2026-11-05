"""Genera lo script SQL che importa i clienti esportati da Fresha.

Uso:
    python scripts/fresha_clients_to_sql.py data/clienti_fresha.csv data/import_clienti.sql

Il CSV è l'export di Fresha "Clienti > Elenco dei clienti > Opzioni > Esporta > CSV".

L'SQL si esegue con DBeaver o psql ed è pensato per un database senza clienti: prima cancella tutti i clienti e poi li
reinserisce. In locale si può rilanciare finché nessun appuntamento, vendita o recensione punta ai clienti (altrimenti
la cancellazione fallisce e non cambia nulla); in produzione si esegue una sola volta, con un export fresco.

Regole (decise col titolare il 2026-11-05):
- schede con stesso telefono e stesso nome = un solo cliente, i campi vuoti si completano a vicenda;
- consensi marketing email/SMS importati, con la data di inserimento come data del consenso;
- solo date di nascita complete (quelle senza anno si scartano);
- prefisso +39 = nazionalità IT (messaggi in italiano), altrimenti vuota.
"""

import csv
import re
import sys

YES = "Sì"
FULL_DATE = re.compile(r"\d{4}-\d{2}-\d{2}")


def sql(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("'", "''") + "'"


def phone(raw):
    """'44 7425 212406' / '\\+44 07554 587527' -> '+447425212406' (E.164), altrimenti None"""
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("440"):
        digits = "44" + digits[3:]
    return "+" + digits if 8 <= len(digits) <= 15 else None


def read_clients(csv_path):
    with open(csv_path, encoding="utf-8-sig", newline="") as f:
        rows = [r for r in csv.DictReader(f) if r["ID cliente"].strip()]

    clients = {}   # chiave: (telefono, nome completo) per chi ha il telefono, altrimenti l'id Fresha
    for r in rows:
        v = {k: (val or "").strip() for k, val in r.items()}
        c = {
            "first_name": v["Nome"],
            "last_name": v["Cognome"] or None,
            "phone": phone(v["Numero di cellulare"]) or phone(v["Telefono"]),
            "email": v["Email"].lower() or None,
            "birth_date": v["Data di nascita"] if FULL_DATE.fullmatch(v["Data di nascita"]) else None,
            "notes": v["Avviso per il personale"] or None,
            "source": v["Fonti di riferimento"] or None,
            "regular": v["Tag"] == "regular",
            "blocked": v["Bloccato"] == YES,
            "email_consent": v["Accetta marketing"] == YES,
            "sms_consent": v["Accetta marketing via SMS"] == YES,
            "added": v["Aggiunto"],
        }
        if c["blocked"] and v["Motivo del blocco"]:
            add_note(c, "Bloccato su Fresha: " + v["Motivo del blocco"])
        key = (c["phone"], v["Nome e cognome"].lower()) if c["phone"] else v["ID cliente"]
        if key in clients:
            merge(clients[key], c)
        else:
            clients[key] = c

    # email unica nel nostro DB: resta sulla prima scheda che la usa, sulle altre va nelle note
    seen = set()
    for c in clients.values():
        if c["email"] in seen:
            add_note(c, "Email usata anche da un'altra scheda: " + c["email"])
            c["email"] = None
        elif c["email"]:
            seen.add(c["email"])
    return len(rows), list(clients.values())


def add_note(c, note):
    c["notes"] = "; ".join(filter(None, [c["notes"], note]))


def merge(a, b):
    if a["email"] and b["email"] and b["email"] != a["email"]:
        add_note(a, "Altra email: " + b["email"])
    for k in ("last_name", "phone", "email", "birth_date", "source"):
        a[k] = a[k] or b[k]
    if b["notes"] and b["notes"] != a["notes"]:
        add_note(a, b["notes"])
    a["regular"] = a["regular"] or b["regular"]
    a["blocked"] = a["blocked"] or b["blocked"]
    a["email_consent"] = a["email_consent"] and b["email_consent"]   # basta un "no" per non scrivere
    a["sms_consent"] = a["sms_consent"] and b["sms_consent"]
    a["added"] = min(a["added"], b["added"])


def main(csv_path, sql_path):
    n_rows, clients = read_clients(csv_path)
    sources = sorted({c["source"] for c in clients if c["source"]})

    out = [f"-- Import clienti Fresha: {len(clients)} clienti da {n_rows} schede, generato da fresha_clients_to_sql.py",
           "SET client_encoding = 'UTF8';",
           "BEGIN;",
           "",
           "DELETE FROM client;",
           ""]
    for i, s in enumerate(sources):
        out.append(f"INSERT INTO client_source (name, sort_order) SELECT {sql(s)}, {i} "
                   f"WHERE NOT EXISTS (SELECT 1 FROM client_source WHERE name = {sql(s)});")
    out.append("INSERT INTO client_tag (name) SELECT 'regular' "
               "WHERE NOT EXISTS (SELECT 1 FROM client_tag WHERE name = 'regular');")
    out.append("")

    for c in clients:
        added = f"({sql(c['added'])}::timestamp AT TIME ZONE 'Europe/London')"
        source = f"(SELECT id FROM client_source WHERE name = {sql(c['source'])})" if c["source"] else "NULL"
        nationality = "'IT'" if c["phone"] and c["phone"].startswith("+39") else "NULL"
        insert = ("INSERT INTO client (first_name, last_name, email, phone, birth_date, notes, source_id, nationality, "
                  "marketing_email_consent_at, marketing_sms_consent_at, online_booking_blocked_at, "
                  "created_at, updated_at) VALUES ("
                  f"{sql(c['first_name'])}, {sql(c['last_name'])}, {sql(c['email'])}, {sql(c['phone'])}, "
                  f"{sql(c['birth_date'])}, {sql(c['notes'])}, {source}, {nationality}, "
                  f"{added if c['email_consent'] else 'NULL'}, {added if c['sms_consent'] else 'NULL'}, "
                  f"{'now()' if c['blocked'] else 'NULL'}, {added}, {added})")
        if c["regular"]:
            out.append(f"WITH c AS ({insert} RETURNING id) INSERT INTO client_tag_assignment (client_id, tag_id) "
                       f"SELECT c.id, t.id FROM c, client_tag t WHERE t.name = 'regular';")
        else:
            out.append(insert + ";")

    out += ["", "COMMIT;", ""]
    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"{n_rows} schede -> {len(clients)} clienti; "
          f"con telefono {sum(1 for c in clients if c['phone'])}, con email {sum(1 for c in clients if c['email'])}, "
          f"con compleanno {sum(1 for c in clients if c['birth_date'])}, "
          f"italiani {sum(1 for c in clients if c['phone'] and c['phone'].startswith('+39'))}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
