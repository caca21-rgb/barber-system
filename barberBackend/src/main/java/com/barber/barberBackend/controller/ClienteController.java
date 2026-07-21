package com.barber.barberBackend.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.barber.barberBackend.generics.GenericController;
import com.barber.barberBackend.model.Cliente;
import com.barber.barberBackend.repository.IClienteRepository;
import com.barber.barberBackend.service.ClienteService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@RestController
@RequestMapping("/clientes")
@Tag(name = "Clientes", description = "Gestión de clientes")
public class ClienteController extends GenericController<Cliente, String, ClienteService> {

    @Autowired
    private IClienteRepository repository;

    @Operation(summary = "Obtener clientes de una barbería")
    @GetMapping("/barberia/{barberiaId}")
    public ResponseEntity<List<Cliente>> getByBarberiaId(@PathVariable Long barberiaId) {
        return ResponseEntity.ok(repository.findByBarberiaId(barberiaId));
    }
}
