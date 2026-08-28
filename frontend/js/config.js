// ── Configuración de Servidor ───────────────────────────────────────────────
// Descomentar la siguiente línea para producción (ej. Railway/Render) y comentar la de localhost
export const API_BASE_URL = "https://barber-system-vmxq.onrender.com";

// Para desarrollo local:
// export const API_BASE_URL = "http://localhost:8080";

export const ENDPOINTS = {
  turnos: `${API_BASE_URL}/turnos`,
  clientes: `${API_BASE_URL}/clientes`,
  servicios: `${API_BASE_URL}/servicios`,
  administradores: `${API_BASE_URL}/administradores`,
  estadisticas: `${API_BASE_URL}/estadisticas`,
  barberias: `${API_BASE_URL}/barberias`,
};

export const HORARIOS_LABORALES = [
  '13:00', '13:30', '14:00', '14:30','15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

// ── Multi-tenant helpers ───────────────────────────────────────────────────

/**
 * Lee el parámetro ?slug=XXX de la URL actual.
 * @returns {string|null}
 */
export function getSlugFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('slug');
}

/**
 * Devuelve la sesión de la barbería guardada en sessionStorage.
 * @returns {{ id, nombreNegocio, slug, activa } | null}
 */
export function getBarberiaSession() {
  const raw = sessionStorage.getItem('barberia');
  return raw ? JSON.parse(raw) : null;
}

/**
 * Guarda la sesión de la barbería en sessionStorage.
 */
export function setBarberiaSession(data) {
  sessionStorage.setItem('barberia', JSON.stringify(data));
}

/**
 * Limpia la sesión de la barbería y el token JWT.
 */
export function clearBarberiaSession() {
  sessionStorage.removeItem('barberia');
  sessionStorage.removeItem('jwt_token');
  localStorage.removeItem('jwt_token');
}

/**
 * Guarda el token JWT.
 */
export function setAuthToken(token, remember = false) {
  if (remember) {
    localStorage.setItem('jwt_token', token);
  } else {
    sessionStorage.setItem('jwt_token', token);
  }
}

/**
 * Obtiene el token JWT actual.
 */
export function getAuthToken() {
  return sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
}

/**
 * Retorna los headers requeridos para endpoints protegidos.
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

