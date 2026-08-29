package com.barber.barberBackend.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Administrador;
import com.barber.barberBackend.repository.IAdministradorRepository;

@Service
public class AdministradorService extends GenericService<Administrador, Long, IAdministradorRepository>
        implements IAdministradorService {

    @Autowired
    private IAdministradorRepository repository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public Administrador login(String email, String contrasenia) {
        if (email == null || contrasenia == null) {
            throw new IllegalArgumentException("El email y la contraseña no pueden ser nulos");
        }

        Administrador administrador = repository.findByEmail(email);
        if (administrador == null) {
            throw new IllegalArgumentException("Credenciales inválidas");
        }

        String storedPassword = administrador.getContrasenia();

        // ── Migración automática one-shot ──────────────────────────────────────────
        // Si la contraseña almacenada NO es un hash BCrypt (no empieza con $2a$, $2b$
        // o $2y$), significa que es texto plano de antes de la migración.
        // Comparamos en texto plano y, si coincide, re-hasheamos y guardamos.
        boolean isBcrypt = storedPassword != null && storedPassword.startsWith("$2");
        if (!isBcrypt) {
            if (!contrasenia.equals(storedPassword)) {
                throw new IllegalArgumentException("Credenciales inválidas");
            }
            // Migrar: guardar el hash BCrypt
            administrador.setContrasenia(passwordEncoder.encode(contrasenia));
            repository.save(administrador);
        } else {
            // Contraseña ya hasheada: comparación normal con BCrypt
            if (!passwordEncoder.matches(contrasenia, storedPassword)) {
                throw new IllegalArgumentException("Credenciales inválidas");
            }
        }

        return administrador;
    }
}
