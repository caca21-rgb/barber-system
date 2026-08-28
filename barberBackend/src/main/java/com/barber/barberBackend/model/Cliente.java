package com.barber.barberBackend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;

@Entity
public class Cliente extends Persona {

    @Id
    private String telefono;

    @ManyToOne
    private Barberia barberia;

    public Cliente() {}

    public Cliente(String telefono, Barberia barberia) {
        this.telefono = telefono;
        this.barberia = barberia;
    }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public Barberia getBarberia() { return barberia; }
    public void setBarberia(Barberia barberia) { this.barberia = barberia; }
}
