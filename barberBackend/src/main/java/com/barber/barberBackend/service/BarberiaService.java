package com.barber.barberBackend.service;

import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Barberia;
import com.barber.barberBackend.repository.IBarberiaRepository;

@Service
public class BarberiaService extends GenericService<Barberia, Long, IBarberiaRepository>
        implements IBarberiaService {

    @Autowired
    private IBarberiaRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public Barberia login(String email, String contrasenia) {
        Barberia barberia = repository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Credenciales inválidas"));
        
        if (!passwordEncoder.matches(contrasenia, barberia.getContrasenia())) {
            throw new RuntimeException("Credenciales inválidas");
        }
        
        if (!barberia.isActiva()) {
            throw new RuntimeException("CUENTA_DESACTIVADA");
        }
        return barberia;
    }

    @Override
    public Optional<Barberia> findBySlug(String slug) {
        return repository.findBySlug(slug);
    }

    @Override
    public Barberia activar(Long id) {
        Barberia b = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Barbería no encontrada"));
        b.setActiva(true);
        return repository.save(b);
    }

    @Override
    public Barberia desactivar(Long id) {
        Barberia b = repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Barbería no encontrada"));
        b.setActiva(false);
        return repository.save(b);
    }
}
