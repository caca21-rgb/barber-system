package com.barber.barberBackend.model;

import jakarta.persistence.Basic;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
public class Administrador extends Persona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Basic
    private String contrasenia;

    @ManyToOne
    private Barberia barberia;

    public Administrador() {}

    public Administrador(Long id, String contrasenia, Barberia barberia) {
        this.id = id;
        this.contrasenia = contrasenia;
        this.barberia = barberia;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getContrasenia() { return contrasenia; }
    public void setContrasenia(String contrasenia) { this.contrasenia = contrasenia; }

    public Barberia getBarberia() { return barberia; }
    public void setBarberia(Barberia barberia) { this.barberia = barberia; }
}
