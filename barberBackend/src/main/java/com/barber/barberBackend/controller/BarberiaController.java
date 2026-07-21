package com.barber.barberBackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.barber.barberBackend.generics.GenericController;
import com.barber.barberBackend.model.Barberia;
import com.barber.barberBackend.repository.IServicioRepository;
import com.barber.barberBackend.service.BarberiaService;
import com.barber.barberBackend.service.TurnoService;
import com.barber.barberBackend.security.JwtUtil;

@RestController
@RequestMapping("/barberias")
@Tag(name = "Barberias", description = "Gestión de cuentas de barberias (multi-tenant)")
public class BarberiaController extends GenericController<Barberia, Long, BarberiaService> {

    @Autowired
    private BarberiaService service;

    @Autowired
    private IServicioRepository servicioRepository;

    @Autowired
    private TurnoService turnoService;

    @Autowired
    private JwtUtil jwtUtil;

    /** Credenciales del superadmin (definidas en application.properties) */
    @Value("${superadmin.email:superadmin@barbersystem.com}")
    private String superadminEmail;

    @Value("${superadmin.password:superadmin123}")
    private String superadminPassword;

    // ─────────────────────────────────────────────────────────
    // Superadmin: validar si el request es del superadmin
    // ─────────────────────────────────────────────────────────

    private boolean isSuperAdmin(String email, String password) {
        return superadminEmail.equals(email) && superadminPassword.equals(password);
    }

    // ─────────────────────────────────────────────────────────
    // Login de barberia
    // ─────────────────────────────────────────────────────────

    @Operation(summary = "Login de barbería", description = "Autentica una barbería por email y contraseña y devuelve JWT")
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String contrasenia = request.get("contrasenia");
        try {
            Barberia barberia = service.login(email, contrasenia);
            String token = jwtUtil.generateToken(barberia.getId(), barberia.getSlug(), barberia.getEmail());
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("id", barberia.getId());
            response.put("nombreNegocio", barberia.getNombreNegocio());
            response.put("slug", barberia.getSlug());
            response.put("activa", barberia.isActiva());
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            if ("CUENTA_DESACTIVADA".equals(e.getMessage())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("Cuenta desactivada. Contacta al administrador.");
            }
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales inválidas");
        }
    }

    // ─────────────────────────────────────────────────────────
    // Registro de nueva barbería
    // ─────────────────────────────────────────────────────────

    @Operation(summary = "Registro público de nueva barbería")
    @PostMapping("/registro")
    public ResponseEntity<?> registro(@RequestBody Barberia barberia) {
        try {
            // Validaciones básicas
            if (barberia.getEmail() == null || barberia.getContrasenia() == null || barberia.getNombreNegocio() == null) {
                return ResponseEntity.badRequest().body("Datos incompletos.");
            }
            
            // Generar slug desde el nombre del negocio si no viene
            if (barberia.getSlug() == null || barberia.getSlug().isEmpty()) {
                String generatedSlug = barberia.getNombreNegocio()
                    .toLowerCase()
                    .replaceAll("[^a-z0-9]+", "-")
                    .replaceAll("^-|-$", "");
                barberia.setSlug(generatedSlug);
            }

            barberia.setActiva(true); // Activa por defecto al registrarse
            Barberia nueva = service.save(barberia);
            
            // Retornamos también un token para auto-login
            String token = jwtUtil.generateToken(nueva.getId(), nueva.getSlug(), nueva.getEmail());
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("barberia", nueva);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error en el registro. Es posible que el email o slug ya existan.");
        }
    }


    // ─────────────────────────────────────────────────────────
    // Login de superadmin
    // ─────────────────────────────────────────────────────────

    @Operation(summary = "Login de superadmin")
    @PostMapping("/superadmin/login")
    public ResponseEntity<?> superadminLogin(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");
        if (isSuperAdmin(email, password)) {
            Map<String, Object> response = new HashMap<>();
            response.put("role", "SUPERADMIN");
            response.put("email", email);
            return ResponseEntity.ok(response);
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales de superadmin inválidas");
    }

    // ─────────────────────────────────────────────────────────
    // Activar / Desactivar (protegido por header de superadmin)
    // ─────────────────────────────────────────────────────────

    @Operation(summary = "Activar cuenta de barbería")
    @PatchMapping("/{id}/activar")
    public ResponseEntity<?> activar(
            @PathVariable Long id,
            @RequestHeader(value = "X-SuperAdmin-Email", required = false) String email,
            @RequestHeader(value = "X-SuperAdmin-Password", required = false) String password) {
        if (!isSuperAdmin(email, password)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado");
        }
        try {
            return ResponseEntity.ok(service.activar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @Operation(summary = "Desactivar cuenta de barbería")
    @PatchMapping("/{id}/desactivar")
    public ResponseEntity<?> desactivar(
            @PathVariable Long id,
            @RequestHeader(value = "X-SuperAdmin-Email", required = false) String email,
            @RequestHeader(value = "X-SuperAdmin-Password", required = false) String password) {
        if (!isSuperAdmin(email, password)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado");
        }
        try {
            return ResponseEntity.ok(service.desactivar(id));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // ─────────────────────────────────────────────────────────
    // Endpoints PÚBLICOS por slug (para el frontend del cliente)
    // ─────────────────────────────────────────────────────────

    @Operation(summary = "Info pública de una barbería por slug")
    @GetMapping("/slug/{slug}")
    public ResponseEntity<?> getBySlug(@PathVariable String slug) {
        return service.findBySlug(slug)
                .map(b -> {
                    if (!b.isActiva()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .<Object>body("Esta barbería no está disponible actualmente.");
                    }
                    Map<String, Object> info = new HashMap<>();
                    info.put("id", b.getId());
                    info.put("nombreNegocio", b.getNombreNegocio());
                    info.put("slug", b.getSlug());
                    info.put("telefono", b.getTelefono());
                    info.put("horaInicio", b.getHoraInicio());
                    info.put("horaFin", b.getHoraFin());
                    info.put("intervaloMinutos", b.getIntervaloMinutos());
                    return ResponseEntity.ok((Object) info);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Servicios de una barbería por slug (público)")
    @GetMapping("/slug/{slug}/servicios")
    public ResponseEntity<?> getServiciosBySlug(@PathVariable String slug) {
        return service.findBySlug(slug)
                .map(b -> {
                    if (!b.isActiva()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .<Object>body("Esta barbería no está disponible.");
                    }
                    return ResponseEntity.ok((Object) servicioRepository.findByBarberiaSlug(slug));
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Horarios ocupados de una barbería por slug (público)")
    @GetMapping("/slug/{slug}/turnos/ocupados")
    public ResponseEntity<?> getTurnosOcupadosBySlug(@PathVariable String slug) {
        return service.findBySlug(slug)
                .map(b -> {
                    if (!b.isActiva()) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .<Object>body("Esta barbería no está disponible.");
                    }
                    List<String> ocupados = turnoService.findDateTimes(b.getId())
                            .stream()
                            .map(LocalDateTime::toString)
                            .collect(Collectors.toList());
                    return ResponseEntity.ok((Object) ocupados);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Actualizar datos de una barbería (Superadmin)")
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizarBarberia(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> datos,
            @RequestHeader("X-SuperAdmin-Email") String email,
            @RequestHeader("X-SuperAdmin-Password") String password) {

        if (!isSuperAdmin(email, password)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Acceso denegado.");
        }

        return service.findById(id)
                .map(b -> {
                    if (datos.containsKey("nombreNegocio") && datos.get("nombreNegocio") != null)
                        b.setNombreNegocio(datos.get("nombreNegocio").toString());
                    if (datos.containsKey("slug") && datos.get("slug") != null)
                        b.setSlug(datos.get("slug").toString());
                    if (datos.containsKey("email") && datos.get("email") != null)
                        b.setEmail(datos.get("email").toString());
                    if (datos.containsKey("contrasenia") && datos.get("contrasenia") != null
                            && !datos.get("contrasenia").toString().isBlank())
                        b.setContrasenia(datos.get("contrasenia").toString());
                    if (datos.containsKey("telefono") && datos.get("telefono") != null)
                        b.setTelefono(datos.get("telefono").toString());
                    if (datos.containsKey("planVencimiento") && datos.get("planVencimiento") != null
                            && !datos.get("planVencimiento").toString().isBlank())
                        b.setPlanVencimiento(LocalDate.parse(datos.get("planVencimiento").toString()));
                        
                    if (datos.containsKey("horaInicio") && datos.get("horaInicio") != null)
                        b.setHoraInicio(datos.get("horaInicio").toString());
                    if (datos.containsKey("horaFin") && datos.get("horaFin") != null)
                        b.setHoraFin(datos.get("horaFin").toString());
                    if (datos.containsKey("intervaloMinutos") && datos.get("intervaloMinutos") != null)
                        b.setIntervaloMinutos(Integer.parseInt(datos.get("intervaloMinutos").toString()));
                        
                    service.save(b);
                    return ResponseEntity.ok((Object) b);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    @Operation(summary = "Actualizar configuración de horarios (Panel Barbería)")
    @PatchMapping("/{id}/config")
    public ResponseEntity<?> actualizarConfiguracion(
            @PathVariable Long id,
            @RequestBody java.util.Map<String, Object> datos) {

        return service.findById(id)
                .map(b -> {
                    if (datos.containsKey("horaInicio") && datos.get("horaInicio") != null)
                        b.setHoraInicio(datos.get("horaInicio").toString());
                    if (datos.containsKey("horaFin") && datos.get("horaFin") != null)
                        b.setHoraFin(datos.get("horaFin").toString());
                    if (datos.containsKey("intervaloMinutos") && datos.get("intervaloMinutos") != null)
                        b.setIntervaloMinutos(Integer.parseInt(datos.get("intervaloMinutos").toString()));
                        
                    service.save(b);
                    return ResponseEntity.ok((Object) b);
                })
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
