package com.morresi.platform.agenda;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.morresi.platform.agenda.AgendaRepository.ItemRow;
import com.morresi.platform.agenda.AgendaRepository.ShiftRow;
import com.morresi.platform.agenda.AgendaRepository.StaffRow;

class AgendaServiceTest {

    private static final LocalDate DAY = LocalDate.of(2026, 7, 10);

    private final AgendaRepository repository = mock(AgendaRepository.class);
    private final AgendaService service = new AgendaService(repository);

    @Test
    void daySpansMidnightToMidnightInSalonTimezone() {
        when(repository.salonTimezone()).thenReturn("Europe/London");

        service.getAgenda(DAY, DAY);

        // In luglio Londra è UTC+1
        OffsetDateTime from = OffsetDateTime.of(2026, 7, 10, 0, 0, 0, 0, ZoneOffset.ofHours(1));
        OffsetDateTime to = from.plusDays(1);
        verify(repository).findStaff(from, to);
        verify(repository).findShifts(from, to, "Europe/London");
        verify(repository).findBlocks(from, to, "Europe/London");
        verify(repository).findItems(from, to, "Europe/London");
    }

    @Test
    void groupsShiftsAndAppointmentsByStaffColumn() {
        UUID roberta = UUID.randomUUID();
        UUID mattia = UUID.randomUUID();
        when(repository.salonTimezone()).thenReturn("Europe/London");
        when(repository.findStaff(any(), any())).thenReturn(List.of(
                new StaffRow(roberta, "Roberta", "Roberta Maio", null, true),
                new StaffRow(mattia, "Mattia", "Mattia Amorico", null, true)));
        when(repository.findShifts(any(), any(), eq("Europe/London"))).thenReturn(List.of(
                new ShiftRow(roberta, DAY.atTime(9, 30), DAY.atTime(14, 30))));
        when(repository.findItems(any(), any(), eq("Europe/London"))).thenReturn(List.of(
                item(mattia, DAY.atTime(10, 0), DAY.atTime(11, 15))));

        Agenda day = service.getAgenda(DAY, DAY);

        assertThat(day.staff()).extracting(Agenda.StaffColumn::displayName).containsExactly("Roberta", "Mattia");
        assertThat(day.staff().get(0).shifts()).hasSize(1);
        assertThat(day.staff().get(0).appointments()).isEmpty();
        assertThat(day.staff().get(1).shifts()).isEmpty();
        assertThat(day.staff().get(1).appointments()).singleElement()
                .satisfies(a -> assertThat(a.clientName()).isEqualTo("Annalisa Ross"));
    }

    private static ItemRow item(UUID staffId, LocalDateTime start, LocalDateTime end) {
        return new ItemRow(staffId, UUID.randomUUID(), UUID.randomUUID(), start, end, "BOOKED", "Annalisa Ross",
                "+447000000000", "Haircut/blow dry", 6500L, true, false, false, 0);
    }
}
