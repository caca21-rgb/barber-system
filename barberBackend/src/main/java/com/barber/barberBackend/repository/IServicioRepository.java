package com.barber.barberBackend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.barber.barberBackend.generics.GenericRepository;
import com.barber.barberBackend.model.Servicio;

@Repository
public interface IServicioRepository extends GenericRepository<Servicio, Long> {

    /** Servicios de una barbería por su slug */
    @Query("SELECT s FROM Servicio s WHERE s.barberia.slug = :slug")
    List<Servicio> findByBarberiaSlug(@Param("slug") String slug);

    /** Servicios de una barbería por su ID */
    List<Servicio> findByBarberiaId(Long barberiaId);
}
