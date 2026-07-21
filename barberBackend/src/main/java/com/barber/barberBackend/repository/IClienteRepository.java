package com.barber.barberBackend.repository;

import java.util.List;

import org.springframework.stereotype.Repository;
import com.barber.barberBackend.generics.GenericRepository;
import com.barber.barberBackend.model.Cliente;

@Repository
public interface IClienteRepository extends GenericRepository<Cliente, String> {
    Cliente findByTelefono(String telefono);
    boolean existsByTelefono(String telefono);
    
    // Filtrar clientes por barbería
    List<Cliente> findByBarberiaId(Long barberiaId);
}
