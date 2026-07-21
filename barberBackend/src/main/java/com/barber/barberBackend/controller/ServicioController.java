package com.barber.barberBackend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.barber.barberBackend.generics.GenericController;
import com.barber.barberBackend.model.Servicio;
import com.barber.barberBackend.repository.IServicioRepository;
import com.barber.barberBackend.service.ServicioService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/servicios")
@Tag(name = "Servicios", description = "Gestión de servicios")
public class ServicioController extends GenericController<Servicio, Long, ServicioService> {

    @Autowired
    private IServicioRepository repository;

    @Operation(summary = "Obtener servicios de una barbería")
    @GetMapping("/barberia/{barberiaId}")
    public ResponseEntity<List<Servicio>> getByBarberiaId(@PathVariable Long barberiaId) {
        return ResponseEntity.ok(repository.findByBarberiaId(barberiaId));
    }
}
