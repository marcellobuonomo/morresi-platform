package com.morresi.platform.agenda;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.NotNull;

/** Servizi per categoria, per il cassetto "Nuovo appuntamento". */
public record ServicePicker(@NotNull List<Category> categories) {

    public record Category(String name,   // NULL = servizi senza categoria
                           @NotNull List<Service> services) {
    }

    public record Service(@NotNull UUID id, @NotNull String name, @NotNull Integer durationMinutes,
                          @NotNull Long priceMinor, @NotNull String priceType) {
    }
}
