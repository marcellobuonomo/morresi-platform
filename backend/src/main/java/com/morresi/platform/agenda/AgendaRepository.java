package com.morresi.platform.agenda;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Letture dell'agenda con proiezioni SQL: tre query per giorno, nessun N+1.
 * Gli orari escono già convertiti nel fuso del salone.
 */
@Repository
public class AgendaRepository {

    record StaffRow(UUID id, String displayName, String fullName, String calendarColor) {
    }

    record ShiftRow(UUID staffId, LocalDateTime start, LocalDateTime end) {
    }

    record ItemRow(UUID staffId, UUID appointmentId, UUID itemId, LocalDateTime start, LocalDateTime end, String status,
                   String clientName, String serviceName, Long priceMinor) {
    }

    private final JdbcClient jdbc;

    public AgendaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String salonTimezone() {
        return jdbc.sql("SELECT timezone FROM salon_settings").query(String.class).single();
    }

    /** Collaboratori in attività con un turno nel giorno, più chiunque (anche ex) abbia appuntamenti nel giorno. */
    public List<StaffRow> findStaff(OffsetDateTime from, OffsetDateTime to) {
        return jdbc.sql("""
                SELECT s.id, s.display_name, trim(s.first_name || ' ' || coalesce(s.last_name, '')) AS full_name,
                       s.calendar_color
                FROM staff s
                WHERE (s.deleted_at IS NULL AND EXISTS (
                         SELECT 1 FROM staff_shift sh
                         WHERE sh.staff_id = s.id AND sh.starts_at < :to AND sh.ends_at > :from))
                   OR EXISTS (
                         SELECT 1 FROM appointment_item i JOIN appointment a ON a.id = i.appointment_id
                         WHERE i.staff_id = s.id AND a.status <> 'CANCELLED'
                           AND i.starts_at < :to AND i.ends_at > :from)
                ORDER BY s.sort_order, s.display_name
                """)
                .param("from", from)
                .param("to", to)
                .query(StaffRow.class)
                .list();
    }

    public List<ShiftRow> findShifts(OffsetDateTime from, OffsetDateTime to, String timezone) {
        return jdbc.sql("""
                SELECT staff_id, starts_at AT TIME ZONE :tz AS start, ends_at AT TIME ZONE :tz AS "end"
                FROM staff_shift
                WHERE starts_at < :to AND ends_at > :from
                ORDER BY starts_at
                """)
                .param("from", from)
                .param("to", to)
                .param("tz", timezone)
                .query(ShiftRow.class)
                .list();
    }

    /** Righe-servizio del giorno, esclusi gli appuntamenti annullati (come su Fresha). */
    public List<ItemRow> findItems(OffsetDateTime from, OffsetDateTime to, String timezone) {
        return jdbc.sql("""
                SELECT i.staff_id, a.id AS appointment_id, i.id AS item_id,
                       i.starts_at AT TIME ZONE :tz AS start, i.ends_at AT TIME ZONE :tz AS "end", a.status,
                       trim(c.first_name || ' ' || coalesce(c.last_name, '')) AS client_name,
                       i.service_name, i.price_minor
                FROM appointment_item i
                JOIN appointment a ON a.id = i.appointment_id
                LEFT JOIN client c ON c.id = a.client_id
                WHERE a.status <> 'CANCELLED' AND i.starts_at < :to AND i.ends_at > :from
                ORDER BY i.starts_at, i.ends_at
                """)
                .param("from", from)
                .param("to", to)
                .param("tz", timezone)
                .query(ItemRow.class)
                .list();
    }
}
