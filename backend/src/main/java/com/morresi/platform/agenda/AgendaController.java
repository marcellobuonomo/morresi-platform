package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

// TODO B-02: proteggere con @PreAuthorize (ADMIN, RECEPTION, STAFF solo la propria colonna)
@RestController
@RequestMapping("/api/v1/agenda")
public class AgendaController {

    /** La vista mese mostra 6 settimane intere. */
    private static final int MAX_DAYS = 42;

    private final AgendaService service;

    public AgendaController(AgendaService service) {
        this.service = service;
    }

    /** Giorni da {@code from} a {@code to} compresi (giorno, 3 giorni, settimana, mese). */
    @GetMapping
    public Agenda getAgenda(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (days < 1 || days > MAX_DAYS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "L'intervallo deve andare da 1 a " + MAX_DAYS + " giorni.");
        }
        return service.getAgenda(from, to);
    }

    @GetMapping("/appointments/{id}")
    public AppointmentDetail getAppointment(@PathVariable UUID id) {
        return service.getAppointment(id);
    }

    /** Servizi per categoria, per il cassetto "Nuovo appuntamento". */
    @GetMapping("/services")
    public ServicePicker getServices() {
        return service.getServices();
    }
}
