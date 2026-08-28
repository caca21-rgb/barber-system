package com.barber.barberBackend.service;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.generics.GenericService;
import com.barber.barberBackend.model.Cliente;
import com.barber.barberBackend.model.Turno;
import com.barber.barberBackend.repository.IClienteRepository;
import com.barber.barberBackend.repository.ITurnoRepository;
import com.barber.barberBackend.repository.IServicioRepository;
import com.barber.barberBackend.model.Servicio;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class TurnoService extends GenericService<Turno, Long, ITurnoRepository> implements ITurnoService {

    private static final Logger logger = LoggerFactory.getLogger(TurnoService.class);

    @Autowired
    ITurnoRepository repository;

    @Autowired
    IClienteRepository clienteRepository;

    @Autowired
    IServicioRepository servicioRepository;

    @Autowired
    com.barber.barberBackend.repository.IBarberiaRepository barberiaRepository;

    @Autowired
    EmailService emailService;

    @Override
    public Turno save(Turno entity) {
        try {
            Cliente cliente = entity.getCliente();
            
            // <-- Validaciones -->
            if (cliente != null && cliente.getTelefono() == null) {
                throw new IllegalArgumentException("El cliente debe tener un Teléfono antes de guardar el turno.");
            }
            // Se mueve la validación más abajo para poder usar la entidad Barberia cargada si es necesario
            
            // Validamos que el turno no esté dado a otro cliente en esta misma barbería
            if (entity.getBarberia() != null && entity.getBarberia().getId() != null) {
                Long bId = entity.getBarberia().getId();
                boolean turnoExists = repository.findDateTimes(entity.getFechaHora().minusMinutes(1), bId)
                                                .stream()
                                                .anyMatch(fechaHora -> fechaHora.equals(entity.getFechaHora()));
                if (turnoExists) {
                    throw new IllegalArgumentException("Ya existe un turno para la fecha y hora especificada. Fecha y hora: " + entity.getFechaHora());
                }
            } else {
                boolean turnoExists = repository.findDateTimes(entity.getFechaHora())
                                                .stream()
                                                .anyMatch(fechaHora -> fechaHora.equals(entity.getFechaHora()));
                if (turnoExists) {
                    throw new IllegalArgumentException("Ya existe un turno para la fecha y hora especificada. Fecha y hora: " + entity.getFechaHora());
                }
            }

            // Buscamos el cliente por teléfono
            Cliente existingCliente = clienteRepository.findByTelefono(cliente.getTelefono());

            if (existingCliente != null) {
                entity.setCliente(existingCliente);
            } else {
                if (entity.getBarberia() != null && entity.getBarberia().getId() != null) {
                    com.barber.barberBackend.model.Barberia b = barberiaRepository.findById(entity.getBarberia().getId()).orElse(null);
                    if (b != null) {
                        cliente.setBarberia(b);
                    }
                }
                cliente = clienteRepository.save(cliente);
                entity.setCliente(cliente);
            }
            
            // Validamos que la fecha y hora del turno sea válida según el horario de la barbería
            validateDateTime(entity);

            Turno savedEntity = repository.save(entity);
            
            // Enviar email de confirmación (si hay un cliente con email válido)
            try {
                emailService.enviarConfirmacionTurno(savedEntity);
            } catch (Exception ex) {
                logger.error("Error al enviar email de confirmación de turno id {}", savedEntity.getId(), ex);
            }

            return savedEntity;
        } catch (Exception e) {
            throw new RuntimeException("Error al guardar el turno: " + e.getMessage(), e);
        }
    }

    // Actualizamos el nombre para no romper la interfaz pero recibe el Turno completo
    public void validateDateTime(Turno turno) {
        try {
            LocalDateTime fechaHora = turno.getFechaHora();
            LocalTime hora = fechaHora.toLocalTime();
            
            LocalTime horaApertura = LocalTime.of(9, 0); // Default
            LocalTime horaCierre = LocalTime.of(18, 0); // Default
            int intervalo = 30;
            
            if (turno.getBarberia() != null && turno.getBarberia().getId() != null) {
                com.barber.barberBackend.model.Barberia b = barberiaRepository.findById(turno.getBarberia().getId()).orElse(null);
                if (b != null) {
                    horaApertura = LocalTime.parse(b.getHoraInicio());
                    horaCierre = LocalTime.parse(b.getHoraFin());
                    intervalo = b.getIntervaloMinutos();
                }
            }

            if (hora.isBefore(horaApertura) || hora.isAfter(horaCierre)) {
                throw new IllegalArgumentException("La hora debe estar entre " + horaApertura + " y " + horaCierre + ".");
            }
            if (hora.getMinute() % intervalo != 0) {
                throw new IllegalArgumentException("La hora debe ser en intervalos de " + intervalo + " minutos.");
            }
        } catch (Exception e) {
            throw new RuntimeException("Error validadando la hora: " + e.getMessage(), e);
        }
    }

    @Override
    public void validateDateTime(LocalDateTime fechaHora) {
        // Mantenido por compatibilidad de la interfaz ITurnoService, 
        // pero la validación real ahora se hace en validateDateTime(Turno turno)
    }

    @Override
    public List<LocalDateTime> findDateTimes() {
        try {
            LocalDateTime ahora = LocalDateTime.now();
            List<LocalDateTime> turnos = repository.findDateTimes(ahora);
            return turnos;
        } catch (Exception e) {
            throw new RuntimeException("Error retrieving date times: " + e.getMessage(), e);
        }
    }

    public List<LocalDateTime> findDateTimes(Long barberiaId) {
        try {
            LocalDateTime ahora = LocalDateTime.now();
            return repository.findDateTimes(ahora, barberiaId);
        } catch (Exception e) {
            throw new RuntimeException("Error retrieving date times: " + e.getMessage(), e);
        }
    }


    
    
}
