package com.barber.barberBackend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Valida en el arranque que las variables de entorno críticas estén presentes
 * cuando la aplicación corre en el perfil "prod".
 * Si falta alguna, lanza IllegalStateException con un mensaje claro (fail-fast).
 */
@Component
public class StartupValidator {

    private static final Logger log = LoggerFactory.getLogger(StartupValidator.class);

    private final Environment env;

    @Value("${jwt.secret:}")
    private String jwtSecret;

    @Value("${superadmin.email:}")
    private String superadminEmail;

    @Value("${superadmin.password:}")
    private String superadminPassword;

    public StartupValidator(Environment env) {
        this.env = env;
    }

    @PostConstruct
    public void validate() {
        boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");
        if (!isProd) {
            log.info("StartupValidator: perfil no-prod detectado, omitiendo validación estricta.");
            return;
        }

        List<String> missing = new ArrayList<>();

        if (jwtSecret.isBlank()) {
            missing.add("JWT_SECRET (jwt.secret) — clave para firmar tokens JWT, mínimo 32 caracteres");
        } else if (jwtSecret.length() < 32) {
            missing.add("JWT_SECRET demasiado corto (" + jwtSecret.length() + " chars). Mínimo 32 caracteres para HS256.");
        }

        if (superadminEmail.isBlank()) {
            missing.add("SUPERADMIN_EMAIL (superadmin.email) — email del superadministrador del sistema");
        }

        if (superadminPassword.isBlank()) {
            missing.add("SUPERADMIN_PASSWORD (superadmin.password) — contraseña del superadmin");
        }

        if (!missing.isEmpty()) {
            String msg = "\n\n" +
                    "╔══════════════════════════════════════════════════════════════════╗\n" +
                    "║  INICIO ABORTADO — Faltan variables de entorno requeridas en prod ║\n" +
                    "╚══════════════════════════════════════════════════════════════════╝\n" +
                    "Variables faltantes o inválidas:\n" +
                    missing.stream().map(m -> "  ❌ " + m).reduce("", (a, b) -> a + "\n" + b) +
                    "\n\nConfigurá estas variables en tu plataforma de deployment (Render, Railway, etc.)\n";
            throw new IllegalStateException(msg);
        }

        log.info("StartupValidator: todas las variables de entorno requeridas están presentes. ✅");
    }
}
