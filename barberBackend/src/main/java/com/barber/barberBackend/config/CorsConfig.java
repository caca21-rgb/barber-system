package com.barber.barberBackend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

@Configuration
public class CorsConfig {

    /**
     * Lista de orígenes permitidos, leída de la propiedad allowed.origins.
     * Soporta múltiples orígenes separados por coma.
     * Ejemplo: http://localhost:3000,https://caca21-rgb.github.io
     */
    @Value("${allowed.origins}")
    private String allowedOriginsRaw;

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();

        // Parsear la lista separada por comas y limpiar espacios
        List<String> origins = Arrays.stream(allowedOriginsRaw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();

        origins.forEach(config::addAllowedOrigin);

        config.addAllowedMethod("*"); // GET, POST, PUT, PATCH, DELETE, OPTIONS
        config.addAllowedHeader("*");
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
