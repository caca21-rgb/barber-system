package com.barber.barberBackend.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    private final int MAX_ATTEMPT = 5;
    private final int BLOCK_DURATION_MINUTES = 15;

    // Mapa para guardar los intentos fallidos por IP
    private final ConcurrentHashMap<String, Integer> attemptsCache = new ConcurrentHashMap<>();
    
    // Mapa para guardar hasta cuándo está bloqueada la IP
    private final ConcurrentHashMap<String, LocalDateTime> blockCache = new ConcurrentHashMap<>();

    public void loginSucceeded(String key) {
        attemptsCache.remove(key);
        blockCache.remove(key);
    }

    public void loginFailed(String key) {
        int attempts = attemptsCache.getOrDefault(key, 0);
        attempts++;
        attemptsCache.put(key, attempts);

        if (attempts >= MAX_ATTEMPT) {
            blockCache.put(key, LocalDateTime.now().plusMinutes(BLOCK_DURATION_MINUTES));
        }
    }

    public boolean isBlocked(String key) {
        if (blockCache.containsKey(key)) {
            LocalDateTime blockTime = blockCache.get(key);
            if (LocalDateTime.now().isBefore(blockTime)) {
                return true;
            } else {
                // El bloqueo expiró, limpiar
                blockCache.remove(key);
                attemptsCache.remove(key);
                return false;
            }
        }
        return false;
    }

    public String getClientIP(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null || xfHeader.isEmpty()) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0].trim();
    }
}
