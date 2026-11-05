package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

/**
 * Letture dell'agenda con proiezioni SQL: poche query per intervallo, nessun N+1.
 * Gli orari escono già convertiti nel fuso del salone.
 */
@Repository
public class AgendaRepository {

    record StaffRow(UUID id, String displayName, String fullName, String calendarColor, boolean active) {
    }

    record ShiftRow(UUID staffId, LocalDateTime start, LocalDateTime end) {
    }

    record BlockRow(UUID staffId, LocalDateTime start, LocalDateTime end, String type, String reason) {
    }

    record ItemRow(UUID staffId, UUID appointmentId, UUID itemId, LocalDateTime start, LocalDateTime end, String status,
                   String clientName, String clientPhone, String serviceName, Long priceMinor, Boolean online,
                   Boolean paid, Boolean hasNotes, Integer clientNoShows) {
    }

    record AppointmentRow(UUID id, String status, LocalDateTime start, LocalDateTime end, Boolean online,
                          UUID clientId, Long saleTotalMinor, Long paidMinor, String clientNotes,
                          String internalNotes) {
    }

    record ClientRow(UUID id, String fullName, String phone, String email, LocalDate birthDate,
                     LocalDateTime clientSince, Boolean firstAppointment) {
    }

    record DetailItemRow(UUID id, String serviceName, LocalDateTime start, Integer durationMinutes, String staffName,
                         Long priceMinor) {
    }

    record ServiceRow(String category, UUID id, String name, Integer durationMinutes, Long priceMinor,
                      String priceType) {
    }

    private static final String ONLINE = "EXISTS (SELECT 1 FROM app_user u WHERE u.id = a.created_by_user_id "
            + "AND u.role = 'CLIENT')";

    private final JdbcClient jdbc;

    public AgendaRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public String salonTimezone() {
        return jdbc.sql("SELECT timezone FROM salon_settings").query(String.class).single();
    }

    /** Collaboratori in attività, più gli ex che hanno appuntamenti nell'intervallo. */
    public List<StaffRow> findStaff(OffsetDateTime from, OffsetDateTime to) {
        return jdbc.sql("""
                SELECT s.id, s.display_name, trim(s.first_name || ' ' || coalesce(s.last_name, '')) AS full_name,
                       s.calendar_color, s.deleted_at IS NULL AS active
                FROM staff s
                WHERE s.deleted_at IS NULL
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

    public List<BlockRow> findBlocks(OffsetDateTime from, OffsetDateTime to, String timezone) {
        return jdbc.sql("""
                SELECT staff_id, starts_at AT TIME ZONE :tz AS start, ends_at AT TIME ZONE :tz AS "end", type, reason
                FROM staff_time_block
                WHERE starts_at < :to AND ends_at > :from
                ORDER BY starts_at
                """)
                .param("from", from)
                .param("to", to)
                .param("tz", timezone)
                .query(BlockRow.class)
                .list();
    }

    /** Righe-servizio dell'intervallo, esclusi gli appuntamenti annullati (come su Fresha). */
    public List<ItemRow> findItems(OffsetDateTime from, OffsetDateTime to, String timezone) {
        return jdbc.sql("""
                SELECT i.staff_id, a.id AS appointment_id, i.id AS item_id,
                       i.starts_at AT TIME ZONE :tz AS start, i.ends_at AT TIME ZONE :tz AS "end", a.status,
                       trim(c.first_name || ' ' || coalesce(c.last_name, '')) AS client_name, c.phone AS client_phone,
                       i.service_name, i.price_minor,
                       %s AS online,
                       EXISTS (SELECT 1 FROM sale s WHERE s.appointment_id = a.id AND s.status = 'COMPLETED') AS paid,
                       (a.client_notes IS NOT NULL OR a.internal_notes IS NOT NULL) AS has_notes,
                       (SELECT count(*) FROM appointment ns
                        WHERE ns.client_id = a.client_id AND ns.status = 'NO_SHOW')::int AS client_no_shows
                FROM appointment_item i
                JOIN appointment a ON a.id = i.appointment_id
                LEFT JOIN client c ON c.id = a.client_id
                WHERE a.status <> 'CANCELLED' AND i.starts_at < :to AND i.ends_at > :from
                ORDER BY i.starts_at, i.ends_at
                """.formatted(ONLINE))
                .param("from", from)
                .param("to", to)
                .param("tz", timezone)
                .query(ItemRow.class)
                .list();
    }

    public Optional<AppointmentRow> findAppointment(UUID id, String timezone) {
        return jdbc.sql("""
                SELECT a.id, a.status, a.starts_at AT TIME ZONE :tz AS start, a.ends_at AT TIME ZONE :tz AS "end",
                       %s AS online, a.client_id,
                       s.total_minor AS sale_total_minor,
                       coalesce((SELECT sum(CASE p.kind WHEN 'PAYMENT' THEN p.amount_minor ELSE -p.amount_minor END)
                                 FROM payment p WHERE p.sale_id = s.id AND p.status = 'SUCCEEDED'), 0) AS paid_minor,
                       a.client_notes, a.internal_notes
                FROM appointment a
                LEFT JOIN sale s ON s.appointment_id = a.id AND s.status <> 'CANCELLED'
                WHERE a.id = :id
                """.formatted(ONLINE))
                .param("id", id)
                .param("tz", timezone)
                .query(AppointmentRow.class)
                .optional();
    }

    /** Scheda cliente; "primo appuntamento" = nessun appuntamento completato prima di questo. */
    public ClientRow findClient(UUID clientId, UUID appointmentId, String timezone) {
        return jdbc.sql("""
                SELECT c.id, trim(c.first_name || ' ' || coalesce(c.last_name, '')) AS full_name, c.phone, c.email,
                       c.birth_date, c.created_at AT TIME ZONE :tz AS client_since,
                       NOT EXISTS (SELECT 1 FROM appointment prev, appointment cur
                                   WHERE cur.id = :appointmentId AND prev.client_id = c.id
                                     AND prev.status = 'COMPLETED' AND prev.starts_at < cur.starts_at)
                         AS first_appointment
                FROM client c
                WHERE c.id = :clientId
                """)
                .param("clientId", clientId)
                .param("appointmentId", appointmentId)
                .param("tz", timezone)
                .query(ClientRow.class)
                .single();
    }

    public List<String> findClientTags(UUID clientId) {
        return jdbc.sql("""
                SELECT t.name FROM client_tag_assignment ta JOIN client_tag t ON t.id = ta.tag_id
                WHERE ta.client_id = :clientId ORDER BY t.name
                """)
                .param("clientId", clientId)
                .query(String.class)
                .list();
    }

    public List<DetailItemRow> findAppointmentItems(UUID appointmentId, String timezone) {
        return jdbc.sql("""
                SELECT i.id, i.service_name, i.starts_at AT TIME ZONE :tz AS start,
                       (extract(epoch FROM i.ends_at - i.starts_at) / 60)::int AS duration_minutes,
                       st.display_name AS staff_name, i.price_minor
                FROM appointment_item i JOIN staff st ON st.id = i.staff_id
                WHERE i.appointment_id = :id
                ORDER BY i.sort_order, i.starts_at
                """)
                .param("id", appointmentId)
                .param("tz", timezone)
                .query(DetailItemRow.class)
                .list();
    }

    /** Servizi attivi, ordinati per categoria come nel catalogo. */
    public List<ServiceRow> findServices() {
        return jdbc.sql("""
                SELECT c.name AS category, s.id, s.name, s.duration_minutes, s.price_minor, s.price_type
                FROM service s LEFT JOIN service_category c ON c.id = s.category_id
                WHERE s.deleted_at IS NULL
                ORDER BY c.sort_order NULLS LAST, c.name, s.sort_order, s.name
                """)
                .query(ServiceRow.class)
                .list();
    }
}
