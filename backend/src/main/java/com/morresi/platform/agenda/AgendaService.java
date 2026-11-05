package com.morresi.platform.agenda;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.morresi.platform.agenda.AgendaDay.Appointment;
import com.morresi.platform.agenda.AgendaDay.StaffColumn;
import com.morresi.platform.agenda.AgendaDay.TimeRange;
import com.morresi.platform.agenda.AgendaRepository.ItemRow;
import com.morresi.platform.agenda.AgendaRepository.ShiftRow;

@Service
public class AgendaService {

    private final AgendaRepository repository;

    public AgendaService(AgendaRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public AgendaDay getDay(LocalDate date) {
        String timezone = repository.salonTimezone();
        ZoneId zone = ZoneId.of(timezone);
        OffsetDateTime from = date.atStartOfDay(zone).toOffsetDateTime();
        OffsetDateTime to = date.plusDays(1).atStartOfDay(zone).toOffsetDateTime();

        Map<UUID, List<TimeRange>> shiftsByStaff = repository.findShifts(from, to, timezone).stream()
                .collect(Collectors.groupingBy(ShiftRow::staffId,
                        Collectors.mapping(s -> new TimeRange(s.start(), s.end()), Collectors.toUnmodifiableList())));
        Map<UUID, List<Appointment>> itemsByStaff = repository.findItems(from, to, timezone).stream()
                .collect(Collectors.groupingBy(ItemRow::staffId,
                        Collectors.mapping(AgendaService::toAppointment, Collectors.toUnmodifiableList())));

        List<StaffColumn> columns = repository.findStaff(from, to).stream()
                .map(s -> new StaffColumn(s.id(), s.displayName(), s.fullName(), s.calendarColor(),
                        shiftsByStaff.getOrDefault(s.id(), List.of()),
                        itemsByStaff.getOrDefault(s.id(), List.of())))
                .toList();
        return new AgendaDay(date, timezone, columns);
    }

    private static Appointment toAppointment(ItemRow row) {
        return new Appointment(row.appointmentId(), row.itemId(), row.start(), row.end(), row.status(),
                row.clientName(), row.serviceName(), row.priceMinor());
    }
}
