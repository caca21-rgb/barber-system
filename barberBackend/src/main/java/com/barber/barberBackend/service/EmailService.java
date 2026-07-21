package com.barber.barberBackend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import com.barber.barberBackend.model.Turno;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${mail.simulation.mode:true}")
    private boolean simulationMode;

    /**
     * Envía un email de confirmación cuando se crea un turno.
     */
    public void enviarConfirmacionTurno(Turno turno) {
        String emailDestino = turno.getCliente() != null ? turno.getCliente().getEmail() : null;
        if (emailDestino == null || emailDestino.isBlank()) {
            logger.warn("El cliente del turno {} no tiene email configurado. Saltando notificación.", turno.getId());
            return;
        }

        String barberiaNombre = turno.getBarberia() != null ? turno.getBarberia().getNombreNegocio() : "Nuestra Barbería";
        String fecha = turno.getFechaHora().toLocalDate().toString();
        String hora = turno.getFechaHora().toLocalTime().toString();

        String subject = "¡Tu turno en " + barberiaNombre + " está confirmado!";
        String text = String.format("Hola %s,\n\nTu turno para el día %s a las %s ha sido confirmado con éxito.\n\n¡Te esperamos en %s!\n\nSaludos.",
                turno.getCliente().getNombre(), fecha, hora, barberiaNombre);

        enviarEmail(emailDestino, subject, text);
    }

    /**
     * Envía un email de recordatorio 1 hora antes.
     */
    public void enviarRecordatorioTurno(Turno turno) {
        String emailDestino = turno.getCliente() != null ? turno.getCliente().getEmail() : null;
        if (emailDestino == null || emailDestino.isBlank()) return;

        String barberiaNombre = turno.getBarberia() != null ? turno.getBarberia().getNombreNegocio() : "Nuestra Barbería";
        String hora = turno.getFechaHora().toLocalTime().toString();

        String subject = "Recordatorio de tu turno en " + barberiaNombre;
        String text = String.format("Hola %s,\n\nTe recordamos que tenés un turno hoy a las %s en %s.\n\n¡Nos vemos pronto!",
                turno.getCliente().getNombre(), hora, barberiaNombre);

        enviarEmail(emailDestino, subject, text);
    }

    private void enviarEmail(String to, String subject, String text) {
        if (simulationMode || mailSender == null) {
            logger.info("======================================================");
            logger.info("[SIMULACIÓN EMAIL] Para: {}", to);
            logger.info("[SIMULACIÓN EMAIL] Asunto: {}", subject);
            logger.info("[SIMULACIÓN EMAIL] Mensaje:\n{}", text);
            logger.info("======================================================");
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(to);
            message.setSubject(subject);
            message.setText(text);
            mailSender.send(message);
            logger.info("Email enviado exitosamente a {}", to);
        } catch (Exception e) {
            logger.error("Error al enviar email a {}: {}", to, e.getMessage());
        }
    }
}
