package com.barber.barberBackend.model;

import jakarta.persistence.MappedSuperclass;

@MappedSuperclass
public abstract class Persona {
    protected String nombre;
    protected String apellido;
    protected String email;

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }

    public String getApellido() { return apellido; }
    public void setApellido(String apellido) { this.apellido = apellido; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}
