"""Genera lo script SQL che importa da Fresha catalogo servizi, appuntamenti, vendite e pagamenti.

Uso (i CSV sono gli export di Fresha, salvati in data/):
    python scripts/fresha_history_to_sql.py data data/import_storico.sql

    data/fresha_service-list.csv          Catalogo > Elenco dei servizi > Opzioni > Scarica CSV
    data/fresha_appointment-list.csv      Report "Elenco degli appuntamenti" > Opzioni > CSV
    data/fresha_sales-log-detail.csv      Report "Dettaglio del registro vendite" > Opzioni > CSV
    data/fresha_sales-list.csv            Report "Elenco delle vendite" > Opzioni > CSV
    data/fresha_payment-transactions.csv  Report "Pagamenti" > Opzioni > CSV

L'SQL si esegue con psql o DBeaver dopo l'import dei clienti (e delle recensioni) ed è ripetibile: prima cancella
pagamenti, vendite, appuntamenti e catalogo, poi li reinserisce.

Regole (decise col titolare il 2026-11-05: "si fa quel che si può senza inventare"):
- servizi creati dal catalogo Fresha attuale; un appuntamento o una vendita con un servizio che non è nel catalogo
  si salta;
- cliente collegato solo se il nome corrisponde a un solo cliente, altrimenti appuntamento/vendita senza cliente;
- stati "Cliente in sede" e "Iniziato" (non previsti dal nostro modello) si saltano, come le vendite di rimborso;
- le sovrapposizioni dello storico si importano come sovrapposizioni forzate dall'admin (forced_overlap);
- Fresha non aveva aliquote: IVA 0 su servizi e righe di vendita.
"""

import csv
import os
import re
import sys
import uuid
from collections import Counter
from datetime import datetime, timedelta

IMPORT_USER = "fresha-import@invalid"   # autore tecnico degli appuntamenti importati, disattivato
STATUS = {"Completato": "COMPLETED", "Cancellato": "CANCELLED", "Mancata presentazione": "NO_SHOW",
          "Nuovo": "BOOKED", "Confermato": "CONFIRMED"}
SALE_STATUS = {"Completato": "COMPLETED", "Da pagare": "OPEN", "Parzialmente pagato": "OPEN"}
METHOD = {"Contanti": "CASH", "Altro": "OTHER"}
BATCH = 500


def sql(value):
    if value is None:
        return "NULL"
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    return "'" + str(value).replace("'", "''") + "'"


def clean(name):
    """Corregge i caratteri persi nell'export Fresha e gli spazi doppi."""
    name = re.sub("L�Or�al", "L'Oréal", name or "", flags=re.IGNORECASE)
    return re.sub(r"\s+", " ", name.replace("�", "–")).strip()


def minor(amount):
    return round(float(amount or 0) * 100)


def when(text):
    """'31 Oct 2026, 6:00pm' -> datetime"""
    return datetime.strptime(text.strip(), "%d %b %Y, %I:%M%p") if text and text.strip() else None


def minutes(text):
    """'1h 15m' / '45m' / '2h' -> 75 / 45 / 120"""
    h = re.search(r"(\d+)h", text)
    m = re.search(r"(\d+)m", text)
    return (int(h.group(1)) if h else 0) * 60 + (int(m.group(1)) if m else 0)


def rows(folder, name):
    with open(os.path.join(folder, name), encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def read_catalog(folder):
    services = []
    for r in rows(folder, "fresha_service-list.csv"):
        if not r.get("Nome della categoria"):
            continue
        name = clean(r["Nome servizio"])
        price_from = name.endswith(" - Da")
        services.append({
            "name": name[:-5].strip() if price_from else name,
            "category": r["Nome della categoria"],
            "description": (r["Descrizione"] or "").strip() or None,
            "duration": minutes(r["Durata"]),
            "price": minor(r["Prezzo al dettaglio"]),
            "price_type": "FROM" if price_from else "FIXED",
            "online": r["Prenotazione online"] == "Funziona abilitata",
        })
    return services


class ServiceMatcher:
    """Nome dello storico -> nome del servizio nel catalogo: prima uguale, poi senza maiuscole se univoco, poi un
    vecchio nome più corto ('Roots/blow dry' -> 'Roots/blow dry (L'Oréal Professionnel Products)') se univoco."""

    def __init__(self, services):
        self.names = [s["name"] for s in services]
        self.exact = {n: n for n in self.names}
        lower = Counter(n.lower() for n in self.names)
        self.lower = {n.lower(): n for n in self.names if lower[n.lower()] == 1}

    def find(self, name):
        name = clean(name)
        found = self.exact.get(name) or self.lower.get(name.lower())
        if found:
            return found
        longer = [n for n in self.names if n.lower().startswith(name.lower() + " (")]
        return longer[0] if len(longer) == 1 else None


def inserts(table, columns, values):
    out = []
    for i in range(0, len(values), BATCH):
        out.append(f"INSERT INTO {table} ({', '.join(columns)}) VALUES\n"
                   + ",\n".join("(" + ", ".join(sql(v) for v in row) + ")" for row in values[i:i + BATCH]) + ";")
    return out


def local(dt):
    return None if dt is None else dt.strftime("%Y-%m-%d %H:%M")


def main(folder, sql_path):
    catalog = read_catalog(folder)
    matcher = ServiceMatcher(catalog)
    skipped = Counter()

    # --- appuntamenti: una riga Fresha = un appuntamento con un servizio
    appts = {}
    for r in rows(folder, "fresha_appointment-list.csv"):
        status = STATUS.get(r["Stato"])
        service = matcher.find(r["Servizio"])
        if not status:
            skipped["appuntamenti con stato " + r["Stato"]] += 1
            continue
        if not service:
            skipped["appuntamenti con servizio non in catalogo"] += 1
            continue
        day = when(r["Data programmata"]).date()
        start, end = r["Fascia oraria appt."].split("-")
        ends = datetime.combine(day, datetime.strptime(end, "%H:%M:%S").time())
        starts = datetime.combine(day, datetime.strptime(start, "%H:%M:%S").time())
        if ends <= starts:   # finisce dopo mezzanotte
            ends += timedelta(days=1)
        appts[r["Codice dell'appuntamento"]] = {
            "id": str(uuid.uuid4()), "item_id": str(uuid.uuid4()),
            "client": clean(r["Cliente"]), "staff": clean(r["Membro del team"]), "service": service,
            "label": clean(r["Servizio"]), "status": status,
            "starts": starts, "ends": ends,
            "created": when(r["Data di creazione"]), "cancelled": when(r["Data di annullamento"]),
            "price": minor(r["Vendite nette"]), "forced": False,
        }

    # sovrapposizioni dello storico = forzate dall'admin
    last_end = {}
    for a in sorted(appts.values(), key=lambda a: (a["staff"], a["starts"])):
        if a["status"] in ("CANCELLED", "NO_SHOW"):
            continue
        if a["staff"] in last_end and a["starts"] < last_end[a["staff"]]:
            a["forced"] = True
        last_end[a["staff"]] = max(last_end.get(a["staff"], a["ends"]), a["ends"])

    # --- vendite: collegate all'appuntamento tramite il codice indicato nei pagamenti
    payments = rows(folder, "fresha_payment-transactions.csv")
    sale_appt = {p["Numero della vendita"]: p["Codice dell'appuntamento"].strip() for p in payments
                 if p["Codice dell'appuntamento"].strip()}
    items_by_sale = {}
    for r in rows(folder, "fresha_sales-log-detail.csv"):
        items_by_sale.setdefault(r["Numero della vendita"], []).append(r)

    sales = {}
    for r in rows(folder, "fresha_sales-list.csv"):
        number = r["Numero della vendita"]
        status = SALE_STATUS.get(r["Stato della vendita"])
        items = items_by_sale.get(number, [])
        if not status:
            skipped["vendite con stato " + r["Stato della vendita"]] += 1
            continue
        appt = appts.get(sale_appt.get(number))
        # vendita di una sola riga collegata a un appuntamento: il servizio è quello dell'appuntamento
        services = [matcher.find(i["Articolo"]) or (appt["service"] if appt and len(items) == 1 else None)
                    for i in items]
        if not items or any(i["Tipologia"] != "Servizio" for i in items) or not all(services):
            skipped["vendite con servizio non in catalogo"] += 1
            continue
        sale = {"id": str(uuid.uuid4()), "number": number, "appt": appt, "client": clean(r["Cliente"]),
                "status": status, "date": when(r["Data della vendita"]), "items": []}
        linked = False
        for i, service in zip(items, services):
            link = bool(appt) and not linked and service == appt["service"]
            linked = linked or link
            sale["items"].append({
                "service": service, "label": clean(i["Articolo"]), "staff": clean(i["Membro del team"]),
                "unit": minor(i["Vendite lorde"]), "discount": abs(minor(i["Sconti sugli articoli"])),   # Fresha: sconti < 0
                "cart_discount": abs(minor(i["Sconti carrello"])), "total": minor(i["Vendite nette"]),
                "appt_item": appt["item_id"] if link else None,
            })
        sales[number] = sale

    used_sales = set()
    pays = []
    for p in payments:
        sale = sales.get(p["Numero della vendita"])
        amount = minor(p["Importo del pagamento"])
        if not sale or p["Tipo di transazione"] != "Vendite" or amount <= 0:
            continue
        pays.append((sale["id"], METHOD.get(p["Metodo di pagamento"], "OTHER"), amount, local(when(p["Data del pagamento"]))))

    # un appuntamento ha al massimo una vendita (sale.appointment_id è unico)
    for s in sales.values():
        if s["appt"] and s["appt"]["id"] in used_sales:
            s["appt"] = None
        elif s["appt"]:
            used_sales.add(s["appt"]["id"])

    staff_names = sorted({a["staff"] for a in appts.values()} |
                         {i["staff"] for s in sales.values() for i in s["items"] if i["staff"]})

    out = [f"-- Import storico Fresha, generato da fresha_history_to_sql.py",
           "SET client_encoding = 'UTF8';",
           "BEGIN;",
           "",
           "DELETE FROM payment; DELETE FROM sale_item; DELETE FROM sale;",
           "DELETE FROM appointment_item; DELETE FROM appointment;",
           "DELETE FROM service_staff; DELETE FROM service; DELETE FROM service_category;",
           "",
           f"INSERT INTO app_user (email, role, status) SELECT {sql(IMPORT_USER)}, 'ADMIN', 'DISABLED' "
           f"WHERE NOT EXISTS (SELECT 1 FROM app_user WHERE email = {sql(IMPORT_USER)});",
           "",
           "-- Collaboratori: confronto sul nome di battesimo già presente (il più lungo che combacia), cognome aggiunto",
           "CREATE TEMP TABLE imp_staff (full_name text PRIMARY KEY, first_name text, last_name text, staff_id uuid);"]
    out += inserts("imp_staff", ["full_name", "first_name", "last_name"],
                   [(n, n.split(" ", 1)[0], n.split(" ", 1)[1] if " " in n else None) for n in staff_names])
    match = ("lower(m.full_name) = lower(s.first_name) OR lower(m.full_name) LIKE lower(s.first_name) || ' %'")
    out += [f"INSERT INTO staff (first_name, last_name, display_name) SELECT m.first_name, m.last_name, m.first_name "
            f"FROM imp_staff m WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE {match});",
            f"UPDATE imp_staff m SET staff_id = (SELECT s.id FROM staff s WHERE {match} "
            f"ORDER BY s.deleted_at NULLS FIRST, length(s.first_name) DESC LIMIT 1);",
            "UPDATE staff s SET last_name = substr(m.full_name, length(s.first_name) + 2) FROM imp_staff m "
            "WHERE m.staff_id = s.id AND s.last_name IS NULL AND length(m.full_name) > length(s.first_name);",
            "",
            "-- Clienti riconoscibili dal nome (un solo cliente con quel nome)",
            "CREATE TEMP TABLE imp_client AS SELECT lower(trim(first_name || ' ' || coalesce(last_name, ''))) AS name, "
            "(array_agg(id))[1] AS id FROM client WHERE deleted_at IS NULL GROUP BY 1 HAVING count(*) = 1;",
            "CREATE UNIQUE INDEX ON imp_client (name);",
            "",
            "-- Catalogo servizi"]
    categories = list(dict.fromkeys(s["category"] for s in catalog))
    out += inserts("service_category", ["name", "sort_order"], [(c, i) for i, c in enumerate(categories)])
    for i, s in enumerate(catalog):
        out.append(f"INSERT INTO service (category_id, name, description, duration_minutes, price_minor, price_type, "
                   f"vat_rate_bp, online_bookable, sort_order) SELECT id, {sql(s['name'])}, {sql(s['description'])}, "
                   f"{s['duration']}, {s['price']}, {sql(s['price_type'])}, 0, {sql(s['online'])}, {i} "
                   f"FROM service_category WHERE name = {sql(s['category'])};")
    out += ["-- Tutti i servizi a tutti i collaboratori in attività (su Fresha: \"Disponibile per: Tutti\")",
            "INSERT INTO service_staff (service_id, staff_id) SELECT sv.id, st.id FROM service sv, staff st "
            "WHERE st.deleted_at IS NULL;",
            "",
            "-- Appuntamenti",
            "CREATE TEMP TABLE imp_appt (id uuid, item_id uuid, client text, staff text, service text, label text, "
            "status text, starts timestamp, ends timestamp, created timestamp, cancelled timestamp, price bigint, "
            "forced boolean);"]
    out += inserts("imp_appt", ["id", "item_id", "client", "staff", "service", "label", "status", "starts", "ends",
                                "created", "cancelled", "price", "forced"],
                   [(a["id"], a["item_id"], a["client"], a["staff"], a["service"], a["label"], a["status"],
                     local(a["starts"]), local(a["ends"]), local(a["created"]), local(a["cancelled"]), a["price"],
                     a["forced"]) for a in appts.values()])
    tz = "AT TIME ZONE 'Europe/London'"
    out += [f"INSERT INTO appointment (id, client_id, status, starts_at, ends_at, created_by_user_id, cancelled_at, "
            f"created_at, updated_at) SELECT a.id, c.id, a.status, a.starts {tz}, a.ends {tz}, "
            f"(SELECT id FROM app_user WHERE email = {sql(IMPORT_USER)}), a.cancelled {tz}, "
            f"coalesce(a.created, a.starts) {tz}, coalesce(a.cancelled, a.created, a.starts) {tz} "
            f"FROM imp_appt a LEFT JOIN imp_client c ON c.name = lower(a.client);",
            f"INSERT INTO appointment_item (id, appointment_id, service_id, staff_id, starts_at, ends_at, service_name, "
            f"price_minor, blocking, forced_overlap, created_at, updated_at) SELECT a.item_id, a.id, sv.id, m.staff_id, "
            f"a.starts {tz}, a.ends {tz}, a.label, a.price, a.status NOT IN ('CANCELLED', 'NO_SHOW'), a.forced, "
            f"coalesce(a.created, a.starts) {tz}, coalesce(a.created, a.starts) {tz} "
            f"FROM imp_appt a JOIN service sv ON sv.name = a.service JOIN imp_staff m ON m.full_name = a.staff;",
            "",
            "-- Vendite, righe e pagamenti",
            "CREATE TEMP TABLE imp_sale (id uuid, number text, appointment_id uuid, client text, status text, "
            "discount bigint, total bigint, sold timestamp);"]
    out += inserts("imp_sale", ["id", "number", "appointment_id", "client", "status", "discount", "total", "sold"],
                   [(s["id"], s["number"], s["appt"]["id"] if s["appt"] else None, s["client"], s["status"],
                     sum(i["cart_discount"] for i in s["items"]), sum(i["total"] for i in s["items"]), local(s["date"]))
                    for s in sales.values()])
    out += [f"INSERT INTO sale (id, appointment_id, client_id, status, number, discount_minor, total_minor, "
            f"completed_at, created_at, updated_at) SELECT s.id, s.appointment_id, coalesce(a.client_id, c.id), "
            f"s.status, s.number, s.discount, s.total, CASE WHEN s.status = 'COMPLETED' THEN s.sold {tz} END, "
            f"s.sold {tz}, s.sold {tz} FROM imp_sale s LEFT JOIN appointment a ON a.id = s.appointment_id "
            f"LEFT JOIN imp_client c ON c.name = lower(s.client);",
            "CREATE TEMP TABLE imp_item (sale_id uuid, appointment_item_id uuid, service text, staff text, label text, "
            "unit bigint, discount bigint, total bigint);"]
    out += inserts("imp_item", ["sale_id", "appointment_item_id", "service", "staff", "label", "unit", "discount",
                                "total"],
                   [(s["id"], i["appt_item"], i["service"], i["staff"] or None, i["label"], i["unit"], i["discount"],
                     i["total"]) for s in sales.values() for i in s["items"]])
    out += ["INSERT INTO sale_item (sale_id, item_type, appointment_item_id, service_id, staff_id, description, "
            "unit_price_minor, discount_minor, vat_rate_bp, total_minor, created_at, updated_at) "
            "SELECT i.sale_id, 'SERVICE', i.appointment_item_id, sv.id, m.staff_id, i.label, i.unit, i.discount, 0, "
            "i.total, s.created_at, s.created_at FROM imp_item i JOIN sale s ON s.id = i.sale_id "
            "JOIN service sv ON sv.name = i.service LEFT JOIN imp_staff m ON m.full_name = i.staff;",
            "CREATE TEMP TABLE imp_payment (sale_id uuid, method text, amount bigint, paid timestamp);"]
    out += inserts("imp_payment", ["sale_id", "method", "amount", "paid"], pays)
    out += [f"INSERT INTO payment (sale_id, method, amount_minor, paid_at, created_at, updated_at) "
            f"SELECT sale_id, method, amount, paid {tz}, paid {tz}, paid {tz} FROM imp_payment;",
            "",
            "COMMIT;",
            ""]

    with open(sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(out))
    print(f"servizi {len(catalog)}, appuntamenti {len(appts)} (sovrapposti {sum(a['forced'] for a in appts.values())}), "
          f"vendite {len(sales)} (collegate a un appuntamento {sum(1 for s in sales.values() if s['appt'])}), "
          f"pagamenti {len(pays)}")
    for reason, n in skipped.most_common():
        print(f"  saltati: {n} {reason}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
