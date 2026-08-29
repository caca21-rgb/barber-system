package com.barber.barberBackend.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("GET /turnos/findDateTimes")
class TurnoFindDateTimesTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("Sin parámetros → 200 con lista vacía")
    void findDateTimesVacio() throws Exception {
        mockMvc.perform(get("/turnos/findDateTimes"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/json"))
                .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("Con parámetro fecha válida → 200 con lista")
    void findDateTimesConFecha() throws Exception {
        mockMvc.perform(get("/turnos/findDateTimes")
                        .param("fecha", "2026-09-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray());
    }
}
