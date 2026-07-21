package com.barber.barberBackend.service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.barber.barberBackend.model.Turno;
import com.barber.barberBackend.repository.ITurnoRepository;

@Component
public class NotificacionScheduler {

    private static final Logger logger = LoggerFactory.getLogger(NotificacionScheduler.class);

    @Autowired
    private ITurnoRepository turnoRepository;

    @Autowired
    private EmailService emailService;

    // Se ejecuta cada minuto (60000 ms)
    @Scheduled(fixedRate = 60000)
    public void enviarNotificaciones() {
        LocalDateTime ahora = LocalDateTime.now();
        // Buscamos turnos que ocurran exactamente entre 60 y 61 minutos desde ahora
        LocalDateTime inicioBusqueda = ahora.plusMinutes(60).truncatedTo(ChronoUnit.MINUTES);
        LocalDateTime finBusqueda = inicioBusqueda.plusMinutes(1);

        // Obtenemos todos los turnos futuros, esto se puede optimizar en BD,
        // pero para mantener compatibilidad reutilizaremos el repositorio y filtraremos.
        // Lo ideal sería un query `findByFechaHoraBetween`
        List<Turno> todosLosTurnos = turnoRepository.findAll();

        for (Turno turno : todosLosTurnos) {
            LocalDateTime fechaTurno = turno.getFechaHora();
            
            if (fechaTurno.isAfter(inicioBusqueda) || fechaTurno.isEqual(inicioBusqueda)) {
                if (fechaTurno.isBefore(finBusqueda)) {
                    enviarAlerta(turno);
                }
            }
        }
    }

    private void enviarAlerta(Turno turno) {
        String nombreCliente = turno.getCliente() != null ? turno.getCliente().getNombre() : "Desconocido";
        String telefonoCliente = turno.getCliente() != null ? turno.getCliente().getTelefono() : "Sin teléfono";
        String barberia = turno.getBarberia() != null ? turno.getBarberia().getNombreNegocio() : "N/A";

        logger.info("Enviando recordatorio a cliente: {} (Barbería: {})", nombreCliente, barberia);
        emailService.enviarRecordatorioTurno(turno);
    }
}
