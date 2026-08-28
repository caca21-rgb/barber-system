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
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

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
                .requestMatchers("/barberias/*/activar", "/barberias/*/desactivar", "/barberias/superadmin/**").permitAll()
                // Resto requiere autenticación (JWT)
                .anyRequest().authenticated()
            )
            // Configuración de cabeceras de seguridad
            .headers(headers -> headers
                .frameOptions(frame -> frame.disable()) // o .sameOrigin() si se requiere iframe propio
                .xssProtection(xss -> xss.disable()) // Spring Security 6 deprecated xssProtection, but if we need modern config we use CSP
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net; connect-src 'self' https://*"))
                .httpStrictTransportSecurity(hsts -> hsts
                    .includeSubDomains(true)
                    .maxAgeInSeconds(31536000))
            )
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
