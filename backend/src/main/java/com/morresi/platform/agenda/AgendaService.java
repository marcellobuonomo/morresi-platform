package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.util.ArrayList;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.morresi.platform.NotFoundException;
import com.morresi.platform.agenda.Agenda.Appointment;
import com.morresi.platform.agenda.Agenda.StaffColumn;
import com.morresi.platform.agenda.Agenda.TimeBlock;
import com.morresi.platform.agenda.Agenda.TimeRange;
import com.morresi.platform.agenda.AgendaRepository.AppointmentRow;
import com.morresi.platform.agenda.AgendaRepository.BlockRow;
import com.morresi.platform.agenda.AgendaRepository.ClientRow;
import com.morresi.platform.agenda.AgendaRepository.ItemRow;
import com.morresi.platform.agenda.AgendaRepository.ServiceRow;
import com.morresi.platform.agenda.AgendaRepository.ShiftRow;

@Service
public class AgendaService {

    private final AgendaRepository repository;

    public AgendaService(AgendaRepository repository) {
        this.repository = repository;
    }

    /** Agenda dei giorni da {@code from} a {@code to} compresi. */
    @Transactional(readOnly = true)
    public Agenda getAgenda(LocalDate from, LocalDate to) {
        String timezone = repository.salonTimezone();
        ZoneId zone = ZoneId.of(timezone);
        OffsetDateTime start = from.atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime end = to.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

        Map<UUID, List<TimeRange>> shifts = groupByStaff(repository.findShifts(start, end, timezone),
                ShiftRow::staffId, s -> new TimeRange(s.start(), s.end()));
        Map<UUID, List<TimeBlock>> blocks = groupByStaff(repository.findBlocks(start, end, timezone),
                BlockRow::staffId, b -> new TimeBlock(b.start(), b.end(), b.type(), b.reason()));
        Map<UUID, List<Appointment>> items = groupByStaff(repository.findItems(start, end, timezone),
                ItemRow::staffId, AgendaService::toAppointment);

        List<StaffColumn> columns = repository.findStaff(start, end).stream()
                .map(s -> new StaffColumn(s.id(), s.displayName(), s.fullName(), s.calendarColor(), s.active(),
                        shifts.getOrDefault(s.id(), List.of()),
                        blocks.getOrDefault(s.id(), List.of()),
                        items.getOrDefault(s.id(), List.of())))
                .toList();
        return new Agenda(from, to, timezone, columns);
    }

    @Transactional(readOnly = true)
    public AppointmentDetail getAppointment(UUID id) {
        String timezone = repository.salonTimezone();
        AppointmentRow row = repository.findAppointment(id, timezone)
                .orElseThrow(() -> new NotFoundException("Appuntamento non trovato."));
        List<AppointmentDetail.Item> items = repository.findAppointmentItems(id, timezone).stream()
                .map(i -> new AppointmentDetail.Item(i.id(), i.serviceName(), i.start(), i.durationMinutes(),
                        i.staffName(), i.priceMinor()))
                .toList();
        long itemsTotal = items.stream().mapToLong(AppointmentDetail.Item::priceMinor).sum();
        AppointmentDetail.Client client = row.clientId() == null ? null : toClient(
                repository.findClient(row.clientId(), id, timezone), repository.findClientTags(row.clientId()));
        return new AppointmentDetail(row.id(), row.status(), row.start(), row.end(), row.online(), client, items,
                row.saleTotalMinor() != null ? row.saleTotalMinor() : itemsTotal, row.paidMinor(),
                row.clientNotes(), row.internalNotes());
    }

    @Transactional(readOnly = true)
    public ServicePicker getServices() {
        Map<String, List<ServicePicker.Service>> byCategory = new LinkedHashMap<>();
        for (ServiceRow s : repository.findServices()) {
            byCategory.computeIfAbsent(s.category(), c -> new ArrayList<>())
                    .add(new ServicePicker.Service(s.id(), s.name(), s.durationMinutes(), s.priceMinor(),
                            s.priceType()));
        }
        return new ServicePicker(byCategory.entrySet().stream()
                .map(e -> new ServicePicker.Category(e.getKey(), List.copyOf(e.getValue())))
                .toList());
    }

    private static <R, T> Map<UUID, List<T>> groupByStaff(List<R> rows, Function<R, UUID> staffId,
                                                         Function<R, T> mapper) {
        return rows.stream().collect(Collectors.groupingBy(staffId,
                Collectors.mapping(mapper, Collectors.toUnmodifiableList())));
    }

    private static Appointment toAppointment(ItemRow row) {
        return new Appointment(row.appointmentId(), row.itemId(), row.start(), row.end(), row.status(),
                row.clientName(), row.clientPhone(), row.serviceName(), row.priceMinor(), row.online(), row.paid(),
                row.hasNotes());
    }

    private static AppointmentDetail.Client toClient(ClientRow row, List<String> tags) {
        return new AppointmentDetail.Client(row.id(), row.fullName(), row.phone(), row.email(), row.birthDate(),
                row.clientSince(), tags, row.firstAppointment());
    }
}
