package com.barber.barberBackend.service;

import java.util.Optional;

import com.barber.barberBackend.generics.IGenericService;
import com.barber.barberBackend.model.Barberia;

public interface IBarberiaService extends IGenericService<Barberia, Long> {
    Barberia login(String email, String contrasenia);
    Optional<Barberia> findBySlug(String slug);
    Barberia activar(Long id);
    Barberia desactivar(Long id);
}
