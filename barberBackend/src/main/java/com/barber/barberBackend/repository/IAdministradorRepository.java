package com.barber.barberBackend.repository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import com.barber.barberBackend.generics.GenericRepository;
import com.barber.barberBackend.model.Administrador;

@Repository
public interface IAdministradorRepository extends GenericRepository<Administrador, Long> {
    // Busca por email para que el service compare la contraseña con BCrypt
    @Query("SELECT a FROM Administrador a WHERE a.email = ?1")
    Administrador findByEmail(String email);
}

