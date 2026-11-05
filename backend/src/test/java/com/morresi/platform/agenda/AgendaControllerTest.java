package com.morresi.platform.agenda;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.morresi.platform.TestcontainersConfiguration;

/** Agenda letta da un Postgres vero (Testcontainers): serve Docker acceso. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AgendaControllerTest {

    private final MockMvc mvc;
    private final JdbcClient jdbc;

    @Autowired
    AgendaControllerTest(MockMvc mvc, JdbcClient jdbc) {
        this.mvc = mvc;
        this.jdbc = jdbc;
    }

    @BeforeEach
    void insertDay() {
        jdbc.sql("""
                INSERT INTO app_user (id, email, role, status)
                VALUES ('00000000-0000-0000-0000-000000000001', 'admin@test.invalid', 'ADMIN', 'ACTIVE');
                INSERT INTO staff (id, first_name, last_name, display_name)
                VALUES ('00000000-0000-0000-0000-0000000000a1', 'Roberta', 'Maio', 'Roberta'),
                       ('00000000-0000-0000-0000-0000000000a2', 'Fatima', 'Chahmi', 'Fatima');
                UPDATE staff SET deleted_at = now() WHERE first_name = 'Fatima';
                INSERT INTO service (id, name, duration_minutes, price_minor)
                VALUES ('00000000-0000-0000-0000-0000000000b1', 'Gentleman haircut', 30, 3000);
                INSERT INTO client (id, first_name, last_name)
                VALUES ('00000000-0000-0000-0000-0000000000c1', 'Angus', 'Lumsden');
                -- 15:00-15:30 a Londra (UTC+1 in luglio)
                INSERT INTO staff_shift (staff_id, starts_at, ends_at)
                VALUES ('00000000-0000-0000-0000-0000000000a1', '2026-07-10 09:30+01', '2026-07-10 14:30+01');
                INSERT INTO appointment (id, client_id, status, starts_at, ends_at, created_by_user_id)
                VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1', 'BOOKED',
                        '2026-07-10 15:00+01', '2026-07-10 15:30+01', '00000000-0000-0000-0000-000000000001'),
                       ('00000000-0000-0000-0000-0000000000d2', NULL, 'CANCELLED',
                        '2026-07-10 16:00+01', '2026-07-10 16:30+01', '00000000-0000-0000-0000-000000000001');
                INSERT INTO appointment_item (appointment_id, service_id, staff_id, starts_at, ends_at, service_name,
                                              price_minor, blocking)
                VALUES ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1',
                        '00000000-0000-0000-0000-0000000000a1', '2026-07-10 15:00+01', '2026-07-10 15:30+01',
                        'Gentleman haircut', 3000, true),
                       ('00000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-0000000000b1',
                        '00000000-0000-0000-0000-0000000000a2', '2026-07-10 16:00+01', '2026-07-10 16:30+01',
                        'Gentleman haircut', 3000, false);
                """).update();
    }

    @Test
    void returnsStaffOnShiftWithAppointmentsInSalonTime() throws Exception {
        mvc.perform(get("/api/v1/agenda").param("date", "2026-07-10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timezone").value("Europe/London"))
                // Fatima è cessata e ha solo un appuntamento annullato: niente colonna
                .andExpect(jsonPath("$.staff.length()").value(1))
                .andExpect(jsonPath("$.staff[0].fullName").value("Roberta Maio"))
                .andExpect(jsonPath("$.staff[0].shifts[0].start").value("2026-07-10T09:30:00"))
                .andExpect(jsonPath("$.staff[0].appointments[0].start").value("2026-07-10T15:00:00"))
                .andExpect(jsonPath("$.staff[0].appointments[0].clientName").value("Angus Lumsden"));
    }

    @Test
    void rejectsInvalidDateWithProblemDetail() throws Exception {
        mvc.perform(get("/api/v1/agenda").param("date", "domani"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.title").value("Bad Request"));
    }
}
