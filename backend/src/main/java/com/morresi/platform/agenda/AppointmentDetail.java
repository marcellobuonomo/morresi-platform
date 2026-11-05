package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/** Dettaglio di un appuntamento per il cassetto dell'agenda. Orari nel fuso del salone. */
public record AppointmentDetail(@NotNull UUID id, @NotNull String status, @NotNull LocalDateTime start,
                                @NotNull LocalDateTime end, @NotNull Boolean online,
                                Client client,   // NULL = cliente anonimo
                                @NotNull List<Item> items, @NotNull Long totalMinor, @NotNull Long paidMinor,
                                String clientNotes, String internalNotes) {

    public record Client(@NotNull UUID id, @NotNull String fullName, String phone, String email, LocalDate birthDate,
                         @NotNull LocalDateTime clientSince, @NotNull List<String> tags,
                         @NotNull Boolean firstAppointment) {
    }

    public record Item(@NotNull UUID id, @NotNull String serviceName, @NotNull LocalDateTime start,
                       @NotNull Integer durationMinutes, @NotNull String staffName, @NotNull Long priceMinor) {
    }
}
