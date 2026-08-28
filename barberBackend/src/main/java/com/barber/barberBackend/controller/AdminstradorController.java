package com.barber.barberBackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.barber.barberBackend.generics.GenericController;
import com.barber.barberBackend.model.Administrador;
import com.barber.barberBackend.service.AdministradorService;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;
import java.util.HashMap;
import com.barber.barberBackend.security.JwtUtil;
import com.barber.barberBackend.security.LoginAttemptService;
import jakarta.servlet.http.HttpServletRequest;

@RestController
@RequestMapping("/administradores")
@Tag(name = "Administradores", description = "Gestión de administradores")
public class AdminstradorController extends GenericController<Administrador, Long, AdministradorService> {
    @Autowired
    private AdministradorService service;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private LoginAttemptService loginAttemptService;

    @Operation(summary = "Iniciar sesión", description = "Autentica un administrador por email y contraseña")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Inicio de sesión exitoso"),
        @ApiResponse(responseCode = "401", description = "Credenciales inválidas", content = @Content)
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Administrador request, HttpServletRequest httpRequest) {
        String ip = loginAttemptService.getClientIP(httpRequest);
        if (loginAttemptService.isBlocked(ip)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body("Demasiados intentos fallidos. Por favor, espere 15 minutos e intente nuevamente.");
        }

        try {
            Administrador admin = service.login(request.getEmail(), request.getContrasenia());
            
            loginAttemptService.loginSucceeded(ip);
            // Generar token JWT. Si el admin tiene barberia, lo asociamos
            Long barberiaId = admin.getBarberia() != null ? admin.getBarberia().getId() : null;
            String slug = admin.getBarberia() != null ? admin.getBarberia().getSlug() : null;
            String token = jwtUtil.generateToken(barberiaId, slug, admin.getEmail());

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("admin", admin);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            loginAttemptService.loginFailed(ip);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas");
        }
    }
}
