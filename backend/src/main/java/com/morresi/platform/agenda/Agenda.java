package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/**
 * Agenda di un intervallo di giorni (giorno, 3 giorni, settimana, mese): una colonna per collaboratore.
 * Orari nel fuso del salone. {@code @NotNull} segna nel contratto OpenAPI i campi sempre presenti.
 */
public record Agenda(@NotNull LocalDate from, @NotNull LocalDate to, @NotNull String timezone,
                     @NotNull List<StaffColumn> staff) {

    /** Collaboratore in attività (o ex con appuntamenti nell'intervallo); "di turno" = ha turni nel giorno. */
    public record StaffColumn(@NotNull UUID id, @NotNull String displayName, @NotNull String fullName,
                              String calendarColor, @NotNull Boolean active, @NotNull List<TimeRange> shifts,
                              @NotNull List<TimeBlock> blocks, @NotNull List<Appointment> appointments) {
    }

    public record TimeRange(@NotNull LocalDateTime start, @NotNull LocalDateTime end) {
    }

    /** Fascia bloccata: ferie, malattia, pausa, formazione, altro. */
    public record TimeBlock(@NotNull LocalDateTime start, @NotNull LocalDateTime end, @NotNull String type,
                            String reason) {
    }

    /** Una riga-servizio dell'appuntamento, nella colonna del collaboratore che la esegue. */
    public record Appointment(@NotNull UUID appointmentId, @NotNull UUID itemId, @NotNull LocalDateTime start,
                              @NotNull LocalDateTime end, @NotNull String status,
                              String clientName,   // NULL = cliente anonimo ("Senza appuntamento")
                              String clientPhone, @NotNull String serviceName, @NotNull Long priceMinor,
                              @NotNull Boolean online, @NotNull Boolean paid, @NotNull Boolean hasNotes,
                              @NotNull Integer clientNoShows) {   // mancate presentazioni del cliente (badge)
    }
}
