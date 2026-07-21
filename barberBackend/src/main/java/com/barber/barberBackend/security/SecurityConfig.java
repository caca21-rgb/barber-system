package com.barber.barberBackend.security;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configure(http)) // usa CorsFilter de CorsConfig
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // Endpoints públicos
                .requestMatchers(HttpMethod.POST, "/barberias/login", "/barberias/registro", "/administradores/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/barberias/slug/**", "/servicios/barberia/**", "/turnos/findDateTimes").permitAll()
                .requestMatchers(HttpMethod.POST, "/turnos").permitAll() // Clientes crean turnos sin auth
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/h2-console/**").permitAll()
                // Superadmin endpoints
                .requestMatchers("/barberias/*/activar", "/barberias/*/desactivar", "/barberias/superadmin/login").permitAll() 
                // Resto requiere autenticación (JWT)
                .anyRequest().authenticated()
            )
            // Para poder ver la consola H2 si está habilitada
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
