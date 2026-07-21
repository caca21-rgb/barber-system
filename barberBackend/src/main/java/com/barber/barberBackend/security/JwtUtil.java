package com.barber.barberBackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Map;

@Component
public class JwtUtil {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Value("${jwt.expiration.ms:86400000}")
    private long jwtExpirationMs;

    private SecretKey getSigningKey() {
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        // Ensure key is at least 256 bits
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        return Keys.hmacShaKeyFor(keyBytes);
    }

    /**
     * Genera un JWT token para una barbería.
     * @param barberiaId ID de la barbería
     * @param slug       Slug de la barbería
     * @param email      Email de la barbería
     */
    public String generateToken(Long barberiaId, String slug, String email) {
        return Jwts.builder()
                .subject(email)
                .claims(Map.of(
                        "barberiaId", barberiaId,
                        "slug", slug,
                        "role", "BARBERIA"
                ))
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs))
                .signWith(getSigningKey())
                .compact();
    }

    /**
     * Valida el token y devuelve los Claims si es válido.
     */
    public Claims validateToken(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Extrae el barberiaId del token JWT.
     */
    public Long getBarberiaId(String token) {
        Claims claims = validateToken(token);
        Object id = claims.get("barberiaId");
        if (id instanceof Integer) return ((Integer) id).longValue();
        if (id instanceof Long) return (Long) id;
        return Long.parseLong(id.toString());
    }

    /**
     * Extrae el slug del token JWT.
     */
    public String getSlug(String token) {
        return (String) validateToken(token).get("slug");
    }

    /**
     * Verifica si el token es válido (no expirado, firma correcta).
     */
    public boolean isValid(String token) {
        try {
            validateToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
