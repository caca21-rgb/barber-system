package com.barber.barberBackend.repository;

import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.barber.barberBackend.generics.GenericRepository;
import com.barber.barberBackend.model.Barberia;

@Repository
public interface IBarberiaRepository extends GenericRepository<Barberia, Long> {
    Optional<Barberia> findBySlug(String slug);
    Optional<Barberia> findByEmailAndContrasenia(String email, String contrasenia);
    boolean existsBySlug(String slug);
    boolean existsByEmail(String email);
}
