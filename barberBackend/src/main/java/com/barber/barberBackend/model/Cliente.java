package com.barber.barberBackend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class Cliente extends Persona {
    @Id
    private String telefono;

    /** Barbería a la que pertenece este cliente */
    @ManyToOne
    private Barberia barberia;
}
