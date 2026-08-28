package com.barber.barberBackend.model;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
public class Servicio {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Basic
    private String tipo;

    private float precio;

    @ManyToOne
    private Barberia barberia;

    public Servicio() {}

    public Servicio(Long id, String tipo, float precio, Barberia barberia) {
        this.id = id;
        this.tipo = tipo;
        this.precio = precio;
        this.barberia = barberia;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTipo() { return tipo; }
    public void setTipo(String tipo) { this.tipo = tipo; }

    public float getPrecio() { return precio; }
    public void setPrecio(float precio) { this.precio = precio; }

    public Barberia getBarberia() { return barberia; }
    public void setBarberia(Barberia barberia) { this.barberia = barberia; }
}
