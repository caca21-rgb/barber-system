// ── Configuración de Servidor ───────────────────────────────────────────────
// Para producción (Railway/Render):
export const API_BASE_URL = "https://barber-system-vmxq.onrender.com";
// Para desarrollo local: cambia a "http://localhost:8080"

export const ENDPOINTS = {
  turnos:          `${API_BASE_URL}/turnos`,
  clientes:        `${API_BASE_URL}/clientes`,
  servicios:       `${API_BASE_URL}/servicios`,
  administradores: `${API_BASE_URL}/administradores`,
  estadisticas:    `${API_BASE_URL}/estadisticas`,
  barberias:       `${API_BASE_URL}/barberias`,
};

export const HORARIOS_LABORALES = [
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

// ── Rutas centralizadas (evita rutas hardcodeadas y rotas) ─────────────────
// Todos los paneles admin están en frontend/admin/ → el sitio público es ../index.html
export const PUBLIC_SITE_URL  = '../index.html';
export const ADMIN_LOGIN_URL  = './login.html';
export const ADMIN_PANEL_URL  = './panel-turnos.html';

// ── Sesión unificada ───────────────────────────────────────────────────────
// FUENTE DE VERDAD: sessionStorage['barberia_admin'] → { id, nombreNegocio, slug, email }
// Backup persistente (solo si el usuario marcó "Recuérdame"):
//   localStorage['barberia_session'] + localStorage['rememberAdmin'] = 'true'
//
// Regla: NUNCA verificar solo localStorage.adminLoggedIn sin confirmar que
// sessionStorage.barberia_admin existe Y tiene un id válido. Eso causa el loop.

/**
 * Guarda la sesión de la barbería tras un login exitoso.
 * @param {Object} data     Respuesta del backend { id, nombreNegocio, slug, token?, email? }
 * @param {boolean} remember  Si true, persiste también en localStorage
 */
export function saveBarberiaSession(data, remember = false) {
  console.log('[Auth] Guardando sesión:', { id: data?.id, slug: data?.slug, remember });

  const sessionObj = {
    id:            data.id,
    nombreNegocio: data.nombreNegocio || data.nombre || '',
    slug:          data.slug || '',
    email:         data.email || '',
  };

  // 1. Siempre guardar en sessionStorage (fuente principal)
  sessionStorage.setItem('barberia_admin', JSON.stringify(sessionObj));

  // 2. Flags de acceso rápido en localStorage
  localStorage.setItem('adminLoggedIn', 'true');
  if (sessionObj.email)         localStorage.setItem('adminEmail',  sessionObj.email);
  if (sessionObj.nombreNegocio) localStorage.setItem('adminNombre', sessionObj.nombreNegocio);

  // 3. Persistencia "recuérdame"
  if (remember) {
    localStorage.setItem('rememberAdmin',    'true');
    localStorage.setItem('barberia_session', JSON.stringify(sessionObj));
  }

  // 4. JWT — solo si el backend lo devuelve y es una string válida
  if (data.token && typeof data.token === 'string'
      && data.token !== 'undefined' && data.token !== 'null') {
    const store = remember ? localStorage : sessionStorage;
    store.setItem('jwt_token', data.token);
    console.log('[Auth] JWT guardado.');
  } else {
    console.log('[Auth] Backend no devolvió JWT (sesión sin token — normal).');
  }
}

/**
 * Devuelve la sesión activa o null.
 * Intenta sessionStorage primero; si la sesión fue recargada y había "recuérdame",
 * la reconstruye desde localStorage.
 * @returns {{ id, nombreNegocio, slug, email } | null}
 */
export function getBarberiaSession() {
  // Intento 1: sessionStorage
  const raw = sessionStorage.getItem('barberia_admin');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id) return parsed;
    } catch (_) {
      sessionStorage.removeItem('barberia_admin');
    }
  }

  // Intento 2: localStorage (solo si el usuario marcó "recuérdame")
  if (localStorage.getItem('rememberAdmin') === 'true') {
    const remembered = localStorage.getItem('barberia_session');
    if (remembered) {
      try {
        const parsed = JSON.parse(remembered);
        if (parsed && parsed.id) {
          // Restaurar en sessionStorage
          sessionStorage.setItem('barberia_admin', remembered);
          console.log('[Auth] Sesión restaurada desde localStorage (recuérdame).');
          return parsed;
        }
      } catch (_) {
        localStorage.removeItem('barberia_session');
      }
    }
  }

  return null;
}

/**
 * Verifica si hay sesión válida.
 */
export function isAuthenticated() {
  const s = getBarberiaSession();
  return !!(s && s.id);
}

/**
 * Guard de ruta para paneles admin.
 * Si no hay sesión válida limpia el estado y redirige al login.
 * Llama esto al inicio del script de cada panel (antes de hacer cualquier fetch).
 * @returns {Object|null} sesión si está autenticado, null si redirigió
 */
export function requireAuth() {
  const session = getBarberiaSession();
  if (!session) {
    console.warn('[Auth] Sin sesión válida → redirigiendo a login.');
    // Limpiar estado inconsistente para no causar loop en login.html
    localStorage.removeItem('adminLoggedIn');
    window.location.replace(ADMIN_LOGIN_URL);
    return null;
  }
  console.log('[Auth] Sesión activa para barbería id:', session.id);
  return session;
}

/**
 * Cierra sesión limpiando TODOS los datos de sesión.
 */
export function clearBarberiaSession() {
  console.log('[Auth] Cerrando sesión...');
  sessionStorage.removeItem('barberia_admin');
  sessionStorage.removeItem('jwt_token');
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('adminLoggedIn');
  localStorage.removeItem('adminEmail');
  localStorage.removeItem('adminNombre');
  localStorage.removeItem('rememberAdmin');
  localStorage.removeItem('barberia_session');
}

// ── JWT helpers (mantener compatibilidad con código existente) ─────────────

/**
 * Guarda el token JWT. Preferir saveBarberiaSession() cuando sea posible.
 */
export function setAuthToken(token, remember = false) {
  if (!token || typeof token !== 'string'
      || token === 'undefined' || token === 'null') {
    console.warn('[Auth] setAuthToken: token inválido ignorado:', token);
    return;
  }
  if (remember) {
    localStorage.setItem('jwt_token', token);
  } else {
    sessionStorage.setItem('jwt_token', token);
  }
}

/**
 * Obtiene el token JWT (filtra strings inválidas que pudo haber guardado código anterior).
 */
export function getAuthToken() {
  const t = sessionStorage.getItem('jwt_token') || localStorage.getItem('jwt_token');
  if (!t || t === 'undefined' || t === 'null') return null;
  return t;
}

/**
 * Headers de autorización para requests al backend.
 */
export function getAuthHeaders() {
  const token = getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

// ── Multi-tenant helpers ───────────────────────────────────────────────────

/** Lee el parámetro ?slug=XXX de la URL actual. */
export function getSlugFromUrl() {
  return new URLSearchParams(window.location.search).get('slug');
}

/** @deprecated Usar getBarberiaSession() */
export function setBarberiaSession(data) {
  sessionStorage.setItem('barberia', JSON.stringify(data));
}
