package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/**
 * Agenda di un giorno: una colonna per collaboratore. Orari nel fuso del salone.
 * {@code @NotNull} segna nel contratto OpenAPI i campi sempre presenti.
 */
public record AgendaDay(@NotNull LocalDate date, @NotNull String timezone, @NotNull List<StaffColumn> staff) {

    public record StaffColumn(@NotNull UUID id, @NotNull String displayName, @NotNull String fullName,
                              String calendarColor, @NotNull List<TimeRange> shifts,
                              @NotNull List<Appointment> appointments) {
    }

    public record TimeRange(@NotNull LocalDateTime start, @NotNull LocalDateTime end) {
    }

    /** Una riga-servizio dell'appuntamento, nella colonna del collaboratore che la esegue. */
    public record Appointment(@NotNull UUID appointmentId, @NotNull UUID itemId, @NotNull LocalDateTime start,
                              @NotNull LocalDateTime end, @NotNull String status,
                              String clientName,   // NULL = cliente anonimo ("Senza appuntamento")
                              @NotNull String serviceName, @NotNull Long priceMinor) {
    }
}
