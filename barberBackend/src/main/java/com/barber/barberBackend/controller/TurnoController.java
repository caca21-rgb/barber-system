package com.barber.barberBackend.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.barber.barberBackend.generics.GenericController;
import com.barber.barberBackend.model.Turno;
import com.barber.barberBackend.service.TurnoService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.http.ResponseEntity;

import com.barber.barberBackend.repository.ITurnoRepository;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@RestController
@RequestMapping("/turnos")
@Tag(name = "Turnos", description = "Gestión de turnos")
public class TurnoController extends GenericController<Turno, Long, TurnoService> {
    @Autowired
    private TurnoService service;

    @Autowired
    private ITurnoRepository repository;

    @Operation(summary = "Obtener fechas y horas ocupadas",
               description = "Devuelve lista de fechas/horas ocupadas. Filtrar por barberiaId para multi-tenant.")
    @GetMapping("/findDateTimes")
    public List<String> getFechasOcupadas(
            @RequestParam(required = false) Long barberiaId) {
        List<LocalDateTime> dateTimes = (barberiaId != null)
                ? service.findDateTimes(barberiaId)
                : service.findDateTimes();
        return dateTimes.stream()
                .map(LocalDateTime::toString)
                .collect(Collectors.toList());
    }

    @Autowired
    private com.barber.barberBackend.service.BarberiaService barberiaService;

    @Operation(summary = "Obtener turnos de una barbería")
    @GetMapping("/barberia/{barberiaId}")
    public ResponseEntity<?> getByBarberiaId(@PathVariable Long barberiaId) {
        return barberiaService.findById(barberiaId).map(b -> {
            if (!b.isActiva()) {
                return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
                        .<Object>body("Cuenta desactivada.");
            }
            return ResponseEntity.ok((Object) repository.findByBarberiaId(barberiaId));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
    @Operation(summary = "Actualizar estado de un turno")
    @PatchMapping("/{id}/estado")
    public ResponseEntity<?> updateEstado(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return service.findById(id).map(turno -> {
            String nuevoEstado = body.get("estado");
            if (nuevoEstado == null || nuevoEstado.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Estado inválido.");
            }
            turno.setEstado(nuevoEstado);
            service.save(turno);
            return ResponseEntity.ok((Object) turno);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }
}

