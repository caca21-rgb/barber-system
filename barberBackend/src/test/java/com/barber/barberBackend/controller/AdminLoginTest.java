package com.barber.barberBackend.controller;

import com.barber.barberBackend.model.Administrador;
import com.barber.barberBackend.repository.IAdministradorRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("POST /administradores/login")
class AdminLoginTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private IAdministradorRepository adminRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        // Crear un admin con contraseña hasheada para cada test
        adminRepository.deleteAll();
        Administrador admin = new Administrador();
        admin.setContrasenia(passwordEncoder.encode("secreto123"));
        // Persona base fields
        admin.setEmail("admin@test.com");
        adminRepository.save(admin);
    }

    @Test
    @DisplayName("Login con credenciales correctas → 200 + token JWT")
    void loginCorrecto() throws Exception {
        Map<String, String> body = Map.of("email", "admin@test.com", "contrasenia", "secreto123");

        mockMvc.perform(post("/administradores/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    @DisplayName("Login con contraseña incorrecta → 401")
    void loginPasswordIncorrecto() throws Exception {
        Map<String, String> body = Map.of("email", "admin@test.com", "contrasenia", "malcontrasenia");

        mockMvc.perform(post("/administradores/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Login con email inexistente → 401")
    void loginEmailInexistente() throws Exception {
        Map<String, String> body = Map.of("email", "noexiste@test.com", "contrasenia", "secreto123");

        mockMvc.perform(post("/administradores/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Login con contraseña en texto plano (migración automática) → 200 + token")
    void loginMigracionPlaintext() throws Exception {
        // Guardar contraseña en texto plano (simula admin pre-migración)
        Administrador admin = adminRepository.findByEmail("admin@test.com");
        admin.setContrasenia("plaintextpass");
        adminRepository.save(admin);

        Map<String, String> body = Map.of("email", "admin@test.com", "contrasenia", "plaintextpass");

        mockMvc.perform(post("/administradores/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());

        // Verificar que la contraseña fue migrada a BCrypt
        Administrador migrado = adminRepository.findByEmail("admin@test.com");
        assert migrado.getContrasenia().startsWith("$2") : "La contraseña debe estar hasheada con BCrypt después de la migración";
    }
}
