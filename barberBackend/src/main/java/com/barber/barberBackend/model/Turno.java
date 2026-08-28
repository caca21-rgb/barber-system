package com.barber.barberBackend.model;

import java.time.LocalDateTime;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
public class Turno {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Basic(optional = false)
    private LocalDateTime fechaHora;

    @ManyToOne
    private Cliente cliente;

    @ManyToOne(optional = true)
    private Servicio servicio;

    @ManyToOne
    private Barberia barberia;

    private String estado = "PENDIENTE";

    public Turno() {}

    public Turno(Long id, LocalDateTime fechaHora, Cliente cliente, Servicio servicio, Barberia barberia, String estado) {
        this.id = id;
        this.fechaHora = fechaHora;
        this.cliente = cliente;
        this.servicio = servicio;
        this.barberia = barberia;
        this.estado = estado;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    public Cliente getCliente() { return cliente; }
    public void setCliente(Cliente cliente) { this.cliente = cliente; }

    public Servicio getServicio() { return servicio; }
    public void setServicio(Servicio servicio) { this.servicio = servicio; }

    public Barberia getBarberia() { return barberia; }
    public void setBarberia(Barberia barberia) { this.barberia = barberia; }

    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
}
