package com.barber.barberBackend.model;

import java.time.LocalDate;

import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class Barberia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Nombre visible del negocio (ej: "Barber Angel") */
    @Basic(optional = false)
    private String nombreNegocio;

    /** Identificador único en la URL (ej: "barber-angel") */
    @Column(unique = true, nullable = false)
    private String slug;

    /** Email de login del dueño de la barbería */
    @Column(unique = true, nullable = false)
    private String email;

    /** Contraseña del dueño (plain text por ahora, igual que el sistema actual) */
    @Basic(optional = false)
    private String contrasenia;

    /** true = activa y puede acceder, false = suspendida */
    private boolean activa = true;

    /** Fecha límite del plan (null = sin vencimiento configurado) */
    private LocalDate planVencimiento;

    /** Teléfono de contacto opcional */
    private String telefono;

    /** Horario de apertura, ej: "09:00" */
    @Column(columnDefinition = "varchar(10) default '09:00'")
    private String horaInicio = "09:00";

    /** Horario de cierre, ej: "18:00" */
    @Column(columnDefinition = "varchar(10) default '18:00'")
    private String horaFin = "18:00";

    /** Duración en minutos de cada franja, ej: 30 */
    @Column(columnDefinition = "int default 30")
    private int intervaloMinutos = 30;
}
