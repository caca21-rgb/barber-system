package com.barber.barberBackend.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class Barberia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nombreNegocio;

    @Column(unique = true, nullable = false)
    private String slug;

    @Column(unique = true, nullable = false)
    private String email;

    private String contrasenia;

    private boolean activa = true;

    private LocalDate planVencimiento;

    private String telefono;

    @Column(length = 10)
    private String horaInicio = "09:00";

    @Column(length = 10)
    private String horaFin = "18:00";

    private int intervaloMinutos = 30;

    private String logoUrl;

    private String bannerUrl;

    @Column(length = 20)
    private String plan = "TRIAL";

    public Barberia() {}

    // Getters & Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNombreNegocio() { return nombreNegocio; }
    public void setNombreNegocio(String nombreNegocio) { this.nombreNegocio = nombreNegocio; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getContrasenia() { return contrasenia; }
    public void setContrasenia(String contrasenia) { this.contrasenia = contrasenia; }

    public boolean isActiva() { return activa; }
    public void setActiva(boolean activa) { this.activa = activa; }

    public LocalDate getPlanVencimiento() { return planVencimiento; }
    public void setPlanVencimiento(LocalDate planVencimiento) { this.planVencimiento = planVencimiento; }

    public String getTelefono() { return telefono; }
    public void setTelefono(String telefono) { this.telefono = telefono; }

    public String getHoraInicio() { return horaInicio; }
    public void setHoraInicio(String horaInicio) { this.horaInicio = horaInicio; }

    public String getHoraFin() { return horaFin; }
    public void setHoraFin(String horaFin) { this.horaFin = horaFin; }

    public int getIntervaloMinutos() { return intervaloMinutos; }
    public void setIntervaloMinutos(int intervaloMinutos) { this.intervaloMinutos = intervaloMinutos; }

    public String getLogoUrl() { return logoUrl; }
    public void setLogoUrl(String logoUrl) { this.logoUrl = logoUrl; }

    public String getBannerUrl() { return bannerUrl; }
    public void setBannerUrl(String bannerUrl) { this.bannerUrl = bannerUrl; }

    public String getPlan() { return plan; }
    public void setPlan(String plan) { this.plan = plan; }
}
