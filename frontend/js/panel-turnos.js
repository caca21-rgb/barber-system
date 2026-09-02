// BUG #1 FIX: Added requireAuth and getBarberiaSession imports.
// requireAuth() is the single guard that checks sessionStorage (+ localStorage "recuérdame")
// and redirects to login only when the session is genuinely absent.
import { API_BASE_URL, ENDPOINTS, HORARIOS_LABORALES, getAuthHeaders, requireAuth, getBarberiaSession, clearBarberiaSession, ADMIN_LOGIN_URL } from "./config.js";

// Llamadas a la API
class ApiService {
    constructor() {
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        // BUG #1 FIX (was): const session = sessionStorage.getItem('barberia_admin');
        //                    this.barberiaId = session ? JSON.parse(session).id : null;
        // Problem: reading sessionStorage directly misses the "recuérdame" fallback in
        // localStorage, so after a page refresh the id was null → threw "No session".
        // Fix: use getBarberiaSession() which checks sessionStorage first, then
        // localStorage (when rememberAdmin=true), and reconstructs the session.
        const session = getBarberiaSession();
        this.barberiaId = session ? session.id : null;
    }

    async makeRequest(url, options = {}) {
        try {
            const config = {
                ...options,
                headers: { 
                    ...this.defaultHeaders, 
                    ...getAuthHeaders(),
                    ...(options.headers || {})
                }
            };

            const response = await fetch(url, config);
            
            // Manejar diferentes tipos de respuesta según el código de estado
            switch (response.status) {
                case 200: // OK - Respuesta con datos
                    return await response.json();
                    
                case 201: // CREATED - Recurso creado (sin datos en el body según tu backend)
                    return { success: true, status: 201, message: 'Resource created' };
                    
                case 204: // NO CONTENT - Operación exitosa sin datos
                    return { success: true, status: 204, message: 'Operation completed successfully' };
                    
                case 404: // NOT FOUND
                    throw new Error(`Resource not found (404)`);
                    
                           case 403: // FORBIDDEN
                    // Logout completo: si no se limpia también el backup de
                    // "recuérdame" (rememberAdmin + barberia_session en localStorage),
                    // login.html lo restaura y vuelve a mandar al panel → bucle infinito.
                    clearBarberiaSession();
                    window.location.replace(ADMIN_LOGIN_URL);
                    throw new Error("Cuenta desactivada. Redirigiendo al login...");

                case 400: // BAD REQUEST
                    let errorMessage = 'Bad request';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.message || errorData.error || errorMessage;
                    } catch (e) {
                        // Si no puede parsear el error como JSON, usar mensaje genérico
                    }
                    throw new Error(`Bad request (400): ${errorMessage}`);
                    
                case 500: // INTERNAL SERVER ERROR
                    throw new Error(`Internal server error (500)`);
                    
                default:
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    // Para otros códigos exitosos, intentar parsear JSON
                    const contentType = response.headers.get('content-type');
                    if (contentType && contentType.includes('application/json')) {
                        return await response.json();
                    }
                    
                    return await response.text();
            }
            
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // GET - Obtener todos los turnos
    async getTurnos() {
        if (!this.barberiaId) throw new Error("No session");
        return this.makeRequest(`${ENDPOINTS.turnos}/barberia/${this.barberiaId}`);
    }

    // GET - Obtener turno por ID
    async getTurnoById(id) {
        return this.makeRequest(`${ENDPOINTS.turnos}/${id}`);
    }
    
    // GET con paginación
    async getTurnosPaginated(page = 0, size = 10) {
        if (!this.barberiaId) throw new Error("No session");
        // We'd need a paginated endpoint for barberia, but for now fallback to the list
        return this.makeRequest(`${ENDPOINTS.turnos}/barberia/${this.barberiaId}`);
    }

    // GET - Obtener fechas ocupadas
    async getOccupiedDates() {
        if (!this.barberiaId) throw new Error("No session");
        return this.makeRequest(`${ENDPOINTS.turnos}/findDateTimes?barberiaId=${this.barberiaId}`);
    }

    // GET - Obtener Servicios
    async getServicios() {
        if (!this.barberiaId) throw new Error("No session");
        return this.makeRequest(`${ENDPOINTS.servicios}/barberia/${this.barberiaId}`);
    }

    // POST - Crear nuevo turno
    async createTurno(turnoData) {
        return this.makeRequest(ENDPOINTS.turnos, {
            method: 'POST',
            body: JSON.stringify(turnoData)
        });
    }

    // PUT - Actualizar turno completo
    async updateTurno(id, turnoData) {
        return this.makeRequest(`${ENDPOINTS.turnos}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(turnoData)
        });
    }

    // PATCH - Actualización parcial
    async patchTurno(id, partialData) {
        return this.makeRequest(`${ENDPOINTS.turnos}/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(partialData)
        });
    }

    // PATCH - Actualizar estado del turno
    async updateEstadoTurno(id, estado) {
        return this.makeRequest(`${ENDPOINTS.turnos}/${id}/estado`, {
            method: 'PATCH',
            body: JSON.stringify({ estado })
        });
    }

    // DELETE - Eliminar turno
    async deleteTurno(id) {
        return this.makeRequest(`${ENDPOINTS.turnos}/${id}`, {
            method: 'DELETE'
        });
    }

}

// turno.model.js - Modelo y utilidades para turnos
class TurnoModel {
    constructor(data) {
        this.id = data.id;
        this.fechaHora = data.fechaHora;
        this.cliente = data.cliente || {};
        this.servicio = data.servicio || {};
    }

    // Convertir datos de la API al formato usado en la interfaz
    static fromApiResponse(apiData) {
        return {
            id: apiData.id,
            fecha: this.extractDate(apiData.fechaHora),
            hora: this.extractTime(apiData.fechaHora),
            cliente: this.getClienteName(apiData.cliente),
            telefono: apiData.cliente?.telefono || '',
            email: apiData.cliente?.email || '',
            servicio: apiData.servicio?.tipo || 'Reserva General',
            estado: (apiData.estado || 'PENDIENTE').toUpperCase(),
            precio: apiData.servicio?.precio || 0
        };
    }

    // Convertir datos de la interfaz al formato de la API
    static toApiFormat(uiData) {
        return {
            id: uiData.id,
            fechaHora: `${uiData.fecha}T${uiData.hora}:00`,
            cliente: {
                nombre: uiData.nombre || null,
                apellido: uiData.apellido || null,
                email: null,
                telefono: uiData.telefono || null
            },
            servicio: {
                id: parseInt(uiData.servicioId),
                tipo: uiData.servicio,
                precio: parseFloat(uiData.precio || 0)
            }
        };
    }

    static extractDate(fechaHora) {
        return fechaHora ? fechaHora.split('T')[0] : '';
    }

    static extractTime(fechaHora) {
        if (!fechaHora) return '';
        const time = fechaHora.split('T')[1];
        return time ? time.substring(0, 5) : '';
    }

    static getClienteName(cliente) {
        if (!cliente) return 'Cliente sin nombre';
        const nombre = cliente.nombre || '';
        const apellido = cliente.apellido || '';
        return `${nombre} ${apellido}`.trim() || 'Cliente sin nombre';
    }
}


// Manejo mejorado de notificaciones con toast
    class NotificationService {
      static show(message, type = 'success') {
        const toast = document.getElementById('notificationToast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
          toastMessage.textContent = message;
          toast.className = `toast ${type === 'success' ? 'bg-success' : 'bg-danger'} text-white`;
          
          const toastBootstrap = new bootstrap.Toast(toast);
          toastBootstrap.show();
        }
      }

      static showError(message) {
        this.show(message, 'error');
      }
    }

    // Reemplazar la clase NotificationService original
    if (typeof window !== 'undefined') {
      window.NotificationService = NotificationService;
    }

// main.js - Lógica principal de la aplicación
class TurnosManager {
    constructor() {
        this.apiService = new ApiService();
        this.turnosData = [];
        
        this.serviciosDisponibles = [
            { id: 1, nombre: 'Corte de pelo', precio: 1500, tipo: 'Corte de pelo' },
            { id: 2, nombre: 'Tintura', precio: 3000, tipo: 'Tintura' },
            { id: 3, nombre: 'Perfilado de barba', precio: 2000, tipo: 'Perfilado de barba' }
        ];
        
        this.horariosDisponibles = HORARIOS_LABORALES;

        this.fechaActualCalendario = new Date();
        this.turnoSeleccionado = null;
        this.vistaActual = 'lista';
        
        // Paginación
        this.currentPage = 1;
        this.itemsPerPage = 10;

        this.init();
    }

    async init() {
        try {
            this.exposeGlobalFunctions();

            this.initializeEventListeners();
            this.actualizarMesActual();
            
            await this.cargarServiciosDesdeAPI(); // Cargar dinámicamente
            await this.cargarTurnosDesdeAPI();
            this.mostrarTurnos();

            // Iniciar polling para alertas de nuevas reservas
            this.iniciarPollingReservas();
        } catch (error) {
            console.error('Error al inicializar la aplicación:', error);
            NotificationService.showError('Error al cargar datos. Verificá tu conexión al backend.');
            this.mostrarTurnos(); // Mostrar interfaz vacía
        }
    }

    async cargarServiciosDesdeAPI() {
        try {
            const apiServicios = await this.apiService.getServicios();
            this.serviciosDisponibles = apiServicios.map(s => ({
                id: s.id,
                nombre: s.tipo,
                precio: s.precio,
                tipo: s.tipo
            }));
            this.cargarServicios(); // Llenar el select
        } catch (error) {
            console.error('Error al cargar servicios:', error);
        }
    }

    async cargarTurnosDesdeAPI() {
        try {
            const apiTurnos = await this.apiService.getTurnos();
            this.turnosData = apiTurnos.map(turno => TurnoModel.fromApiResponse(turno));
        } catch (error) {
            console.error('Error al cargar turnos:', error);
            // Usar datos de respaldo o mostrar error
            this.turnosData = [];
            throw error;
        }
    }

    initializeEventListeners() {
        // Filtros
        const elementos = {
            'filtro-fecha': () => this.aplicarFiltros(),
            'filtro-estado': () => this.aplicarFiltros(),
            'filtro-servicio': () => this.aplicarFiltros(),
            'buscar-turno': () => this.aplicarFiltros()
        };

        Object.entries(elementos).forEach(([id, handler]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                const eventType = id === 'buscar-turno' ? 'input' : 'change';
                elemento.addEventListener(eventType, handler);
            }
        });

        // Listener en editarFecha: recarga horarios disponibles al cambiar fecha en el modal
        const editarFechaEl = document.getElementById('editarFecha');
        if (editarFechaEl) {
            editarFechaEl.addEventListener('change', () => {
                this.actualizarHorariosDisponibles(editarFechaEl.value);
            });
        }

        // Exponer funciones globales necesarias
        this.exposeGlobalFunctions();
    }

    exposeGlobalFunctions() {
        // Asignar al window para que los onclick de HTML funcionen
        window.cambiarVista = (vista) => this.cambiarVista(vista);
        window.limpiarFiltros = () => this.limpiarFiltros();
        window.editarTurno = (id) => this.editarTurno(id);
        window.guardarEdicionTurno = () => this.guardarEdicionTurno();
        window.cancelarTurno = (id) => this.cancelarTurno(id);
        window.cambiarEstadoTurno = (id, estado) => this.cambiarEstadoTurno(id, estado);
        window.navegarMes = (direccion) => this.navegarMes(direccion);
        window.seleccionarDia = (fecha) => this.seleccionarDia(fecha);
        window.guardarConfiguracion = (e) => this.guardarConfiguracion(e);
        window.cambiarPagina = (pag) => { this.currentPage = pag; this.mostrarTurnos(); };
        window.cambiarItemsPorPagina = (select) => { this.itemsPerPage = parseInt(select.value); this.currentPage = 1; this.mostrarTurnos(); };
        
        // NOTA: El submit de formConfiguracion es manejado exclusivamente
        // por el listener del DOMContentLoaded (línea ~1351) para evitar doble request.
    }

    async guardarConfiguracion(e) {
        if (e) e.preventDefault();

        // Obtener id desde la sesión unificada (soporta "recuérdame")
        const barberiaId = getBarberiaSession()?.id;
        if (!barberiaId) {
            NotificationService.showError("No hay sesión activa.");
            return;
        }

        const horaInicio = document.getElementById('configHoraInicio').value;
        const horaFin = document.getElementById('configHoraFin').value;
        const intervaloMinutos = document.getElementById('configIntervalo').value;

        try {
            const btn = document.getElementById('btnGuardarConfig');
            if (btn) btn.disabled = true;

            const res = await fetch(`${ENDPOINTS.barberias}/${barberiaId}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ horaInicio, horaFin, intervaloMinutos })
            });

            if (!res.ok) throw new Error("Error al guardar configuración");

            const payload = { horaInicio, horaFin, intervaloMinutos };
            localStorage.setItem("barberiaConfig_" + barberiaId, JSON.stringify(payload));

            NotificationService.show("Configuración guardada con éxito", "success");
        } catch (error) {
            console.error(error);
            NotificationService.showError("Hubo un error al guardar la configuración.");
        } finally {
            const btn = document.getElementById('btnGuardarConfig');
            if (btn) btn.disabled = false;
        }
    }

    iniciarPollingReservas() {
        // Revisar cada 10 segundos si hay nuevos turnos
        setInterval(async () => {
            try {
                const turnosAnteriores = this.turnosData.length;
                await this.cargarTurnosDesdeAPI();
                const turnosActuales = this.turnosData.length;
                
                if (turnosActuales > turnosAnteriores) {
                    const nuevos = turnosActuales - turnosAnteriores;
                    const mensaje = nuevos === 1 ? '¡Tienes 1 nueva reserva!' : `¡Tienes ${nuevos} nuevas reservas!`;
                    NotificationService.show(mensaje, 'success');
                    
                    // Actualizar la vista actual
                    if (this.vistaActual === 'lista') {
                        this.mostrarTurnos();
                    } else {
                        this.generarCalendario();
                    }
                    
                    // Reproducir un pequeño sonido de alerta
                    this.reproducirSonidoAlerta();
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        }, 10000);
    }

    reproducirSonidoAlerta() {
        try {
            // Sonido de notificación simple con API de AudioContext (para no depender de un archivo mp3)
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
            gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
            
            osc.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
            osc.stop(ctx.currentTime + 0.5);
        } catch(e) {}
    }

    cargarServicios() {
        const selectServicio = document.getElementById('editarServicio');
        if (!selectServicio) return;

        selectServicio.innerHTML = '<option value="">Seleccionar servicio</option>';
        this.serviciosDisponibles.forEach(servicio => {
            selectServicio.innerHTML += `<option value="${servicio.id}">${servicio.nombre} - $${servicio.precio}</option>`;
        });
    }
    //! Revisar
    /*
    cargarHorarios() {
        const selectHora = document.getElementById('editarHora');
        if (!selectHora) return;

        selectHora.innerHTML = '<option value="">Seleccionar hora</option>';
        this.horariosDisponibles.forEach(hora => {
            selectHora.innerHTML += `<option value="${hora}">${hora}</option>`;
        });
    }
    */

    cambiarVista(vista) {
        this.vistaActual = vista;
        
        const elementos = {
            lista: {
                vista: document.getElementById('vista-lista'),
                btn: document.getElementById('btn-lista'),
                claseVista: 'vista-activa',
                claseBtn: 'btn btn-primario active'
            },
            calendario: {
                vista: document.getElementById('vista-calendario'),
                btn: document.getElementById('btn-calendario'),
                claseVista: 'vista-activa',
                claseBtn: 'btn btn-primario active'
            }
        };

        // Resetear todas las vistas
        Object.values(elementos).forEach(el => {
            if (el.vista) el.vista.className = 'vista-oculta';
            if (el.btn) el.btn.className = 'btn btn-secundario';
        });

        // Activar vista seleccionada
        if (elementos[vista]) {
            if (elementos[vista].vista) elementos[vista].vista.className = elementos[vista].claseVista;
            if (elementos[vista].btn) elementos[vista].btn.className = elementos[vista].claseBtn;
        }

        // Cargar contenido según la vista
        if (vista === 'lista') {
            this.mostrarTurnos();
        } else if (vista === 'calendario') {
            this.generarCalendario();
        }
    }

    mostrarTurnos() {
        if (!this.turnosData) this.turnosData = [];
        const turnosFiltrados = this.aplicarFiltrosData();
        // FIX: usar el <tbody> correcto, no el <table>
        const tbody = document.getElementById('tabla-turnos-body');
        const totalTurnos = document.getElementById('total-turnos');
        const estadisticasTotalTurnos = document.getElementById('stats-total');
        const statsConfirmados = document.getElementById('stats-confirmados');
        const statsPendientes = document.getElementById('stats-pendientes');
        const statsIngresos = document.getElementById('stats-ingresos');

        if (!tbody) return;

        tbody.innerHTML = '';

        // Calcular estadísticas
        if (totalTurnos) totalTurnos.textContent = `${turnosFiltrados.length} turnos`;
        if (estadisticasTotalTurnos) estadisticasTotalTurnos.textContent = `${turnosFiltrados.length}`;

        // FIX: comparar con estados en MAYÚSCULAS (modelo siempre devuelve uppercase)
        const confirmados = turnosFiltrados.filter(t => t.estado === 'COMPLETADO').length;
        const pendientes  = turnosFiltrados.filter(t => t.estado === 'PENDIENTE').length;
        
        const ingresosHoy = turnosFiltrados.reduce((total, t) => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            
            const crearFechaLocal = (fechaString) => {
                const fecha = new Date(fechaString);
                if (fechaString.includes('T')) {
                    return new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);
                }
                const partes = fechaString.split('-');
                if (partes.length === 3) {
                    return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
                }
                return fecha;
            };

            const fechaTurno = crearFechaLocal(t.fecha);
            fechaTurno.setHours(0, 0, 0, 0);
            
            if (fechaTurno.getTime() === hoy.getTime()) {
                return total + t.precio;
            }
            return total;
        }, 0);
        
        if (statsConfirmados) {
            statsConfirmados.textContent = confirmados;
        }
        if (statsPendientes) {
            statsPendientes.textContent = pendientes;
        }
        if (statsIngresos) {
            statsIngresos.textContent = `$${ingresosHoy.toLocaleString()}`;
        }
        
        // Paginación
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const turnosPaginados = turnosFiltrados.slice(startIndex, endIndex);
        
        turnosPaginados.forEach(turno => {
            const row = tbody.insertRow();
            const fechaFormateada = turno.fecha.split("T")[0].split("-").reverse().join("/");
            const estadoBadge = this.getEstadoBadge(turno.estado);
            const isPendiente = turno.estado === 'PENDIENTE';
            
            // Generar enlace de WhatsApp si hay teléfono
            let whatsappBtn = '';
            if (turno.telefono) {
                const telClean = turno.telefono.replace(/\D/g, '');
                const msg = encodeURIComponent(`Hola ${turno.cliente}, te escribimos de Barber System para recordarte tu turno el día ${fechaFormateada} a las ${turno.hora}.`);
                whatsappBtn = `<a href="https://wa.me/${telClean}?text=${msg}" target="_blank" class="table-action-btn" style="background:rgba(37,211,102,0.15);color:#25d366;border-color:rgba(37,211,102,0.3)" title="Avisar por WhatsApp"><i class="bi bi-whatsapp"></i></a>`;
            }
            
            // Botones rápidos de estado (solo si está pendiente)
            const btnCompletar = isPendiente ? `<button class="table-action-btn btn-confirm" onclick="cambiarEstadoTurno(${turno.id}, 'COMPLETADO')" title="Marcar como completado"><i class="bi bi-check-lg"></i></button>` : '';
            const btnNoAsistio = isPendiente ? `<button class="table-action-btn btn-cancel-a" onclick="cambiarEstadoTurno(${turno.id}, 'NO_ASISTIO')" title="No asistió"><i class="bi bi-person-x"></i></button>` : '';
            
            row.innerHTML = `
                <td>${fechaFormateada}</td>
                <td><strong>${turno.hora}</strong></td>
                <td>
                    <div>${turno.cliente}</div>
                    <small class="text-muted">${turno.telefono}</small>
                </td>
                <td>${turno.servicio}</td>
                <td>${estadoBadge}</td>
                <td><strong>$${turno.precio.toLocaleString()}</strong></td>
                <td>
                    <div class="d-flex gap-1 flex-wrap">
                        ${btnCompletar}
                        ${btnNoAsistio}
                        ${whatsappBtn}
                        <button class="table-action-btn btn-edit-a" onclick="editarTurno(${turno.id})" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button class="table-action-btn btn-cancel-a" onclick="cancelarTurno(${turno.id})" title="Cancelar"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            `;
        });
        
        this.renderPaginacion(turnosFiltrados.length);
    }

    renderPaginacion(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        let html = '';
        
        if (totalPages > 1) {
            html += `<nav><ul class="pagination pagination-sm justify-content-end mb-0">`;
            
            // Prev
            if (this.currentPage > 1) {
                html += `<li class="page-item"><a class="page-link bg-dark text-light border-secondary" href="#" onclick="event.preventDefault(); cambiarPagina(${this.currentPage - 1})">&laquo;</a></li>`;
            } else {
                html += `<li class="page-item disabled"><a class="page-link bg-dark text-muted border-secondary" href="#">&laquo;</a></li>`;
            }
            
            // Pages
            let startPage = Math.max(1, this.currentPage - 2);
            let endPage = Math.min(totalPages, this.currentPage + 2);
            
            for (let i = startPage; i <= endPage; i++) {
                if (i === this.currentPage) {
                    html += `<li class="page-item active"><a class="page-link border-primary" style="background-color:var(--primary); color:white;" href="#">${i}</a></li>`;
                } else {
                    html += `<li class="page-item"><a class="page-link bg-dark text-light border-secondary" href="#" onclick="event.preventDefault(); cambiarPagina(${i})">${i}</a></li>`;
                }
            }
            
            // Next
            if (this.currentPage < totalPages) {
                html += `<li class="page-item"><a class="page-link bg-dark text-light border-secondary" href="#" onclick="event.preventDefault(); cambiarPagina(${this.currentPage + 1})">&raquo;</a></li>`;
            } else {
                html += `<li class="page-item disabled"><a class="page-link bg-dark text-muted border-secondary" href="#">&raquo;</a></li>`;
            }
            
            html += `</ul></nav>`;
        }
        
        // Agregar selector de items por página y el nav de paginación
        let pagContainer = document.getElementById('paginacion-container');
        if (!pagContainer) {
            pagContainer = document.createElement('div');
            pagContainer.id = 'paginacion-container';
            pagContainer.className = 'd-flex justify-content-between align-items-center mt-3 pt-3 border-top border-secondary border-opacity-25';
            const tbody = document.getElementById('tabla-turnos');
            tbody.closest('.table-responsive').after(pagContainer);
        }
        
        pagContainer.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <span class="text-muted-th small">Mostrar</span>
                <select class="form-select form-select-sm bg-dark text-light border-secondary" style="width:70px" onchange="cambiarItemsPorPagina(this)">
                    <option value="10" ${this.itemsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${this.itemsPerPage === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${this.itemsPerPage === 50 ? 'selected' : ''}>50</option>
                </select>
                <span class="text-muted-th small">por página</span>
            </div>
            ${html}
        `;
    }

    getEstadoBadge(estado) {
        const badges = {
            'PENDIENTE':    '<span class="badge" style="background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);">⏳ Pendiente</span>',
            'COMPLETADO':   '<span class="badge" style="background:rgba(52,211,153,0.2);color:#34d399;border:1px solid rgba(52,211,153,0.4);">✅ Completado</span>',
            'CANCELADO':    '<span class="badge" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);">❌ Cancelado</span>',
            'NO_ASISTIO':   '<span class="badge" style="background:rgba(148,163,184,0.2);color:#94a3b8;border:1px solid rgba(148,163,184,0.4);">🚫 No asistió</span>',
            // Compatibilidad con valores viejos
            'confirmado':   '<span class="badge" style="background:rgba(52,211,153,0.2);color:#34d399;border:1px solid rgba(52,211,153,0.4);">✅ Completado</span>',
            'pendiente':    '<span class="badge" style="background:rgba(251,191,36,0.2);color:#fbbf24;border:1px solid rgba(251,191,36,0.4);">⏳ Pendiente</span>',
            'cancelado':    '<span class="badge" style="background:rgba(239,68,68,0.2);color:#f87171;border:1px solid rgba(239,68,68,0.4);">❌ Cancelado</span>'
        };
        return badges[estado] || `<span class="badge bg-secondary">❓ ${estado || 'Pendiente'}</span>`;
    }

    aplicarFiltros() {
        this.currentPage = 1; // Volver a la página 1 al filtrar
        this.mostrarTurnos();
    }

    aplicarFiltrosData() {
        let turnosFiltrados = [...this.turnosData];
        
        // Filtro por fecha
        const filtroFecha = document.getElementById('filtro-fecha')?.value;
        // Filtro por rango de fechas
        const fechaDesde = document.getElementById('filtro-fecha-desde')?.value;
        const fechaHasta = document.getElementById('filtro-fecha-hasta')?.value;
        
        if (fechaDesde || fechaHasta) {
            turnosFiltrados = turnosFiltrados.filter(turno => {
                const fechaTurno = new Date(turno.fecha);
                fechaTurno.setHours(0, 0, 0, 0);
                
                if (fechaDesde && fechaHasta) {
                    const desde = new Date(fechaDesde);
                    const hasta = new Date(fechaHasta);
                    hasta.setHours(23, 59, 59, 999);
                    return fechaTurno >= desde && fechaTurno <= hasta;
                } else if (fechaDesde) {
                    const desde = new Date(fechaDesde);
                    return fechaTurno >= desde;
                } else if (fechaHasta) {
                    const hasta = new Date(fechaHasta);
                    hasta.setHours(23, 59, 59, 999);
                    return fechaTurno <= hasta;
                }
                return true;
            });
        }

        if (filtroFecha) {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);

        // Función helper para crear fecha local desde string
        const crearFechaLocal = (fechaString) => {
            const fecha = new Date(fechaString);
            // Si la fecha viene en formato ISO, asegurar que se interprete como local
            if (fechaString.includes('T')) {
            // Si tiene información de tiempo, usar como está
            return new Date(fecha.getTime() + fecha.getTimezoneOffset() * 60000);
            }
            // Si solo es fecha (YYYY-MM-DD), crear fecha local
            const partes = fechaString.split('-');
            if (partes.length === 3) {
            return new Date(parseInt(partes[0]), parseInt(partes[1]) - 1, parseInt(partes[2]));
            }
            return fecha;
        };

        switch (filtroFecha) {
            case 'hoy':
            turnosFiltrados = turnosFiltrados.filter(t => {
                const fechaTurno = crearFechaLocal(t.fecha);
                fechaTurno.setHours(0, 0, 0, 0);
                return fechaTurno.getTime() === hoy.getTime();
            });
            break;
            
            case 'manana':
            turnosFiltrados = turnosFiltrados.filter(t => {
                const fechaTurno = crearFechaLocal(t.fecha);
                fechaTurno.setHours(0, 0, 0, 0);
                return fechaTurno.getTime() === manana.getTime();
            });
            break;
            
            case 'semana':
            const inicioSemana = new Date(hoy);
            inicioSemana.setDate(hoy.getDate() - hoy.getDay());
            const finSemana = new Date(inicioSemana);
            finSemana.setDate(inicioSemana.getDate() + 6);
            finSemana.setHours(23, 59, 59, 999);
            
            turnosFiltrados = turnosFiltrados.filter(t => {
                const fechaTurno = crearFechaLocal(t.fecha);
                return fechaTurno >= inicioSemana && fechaTurno <= finSemana;
            });
            break;
            
            case 'mes':
            turnosFiltrados = turnosFiltrados.filter(t => {
                const fechaTurno = crearFechaLocal(t.fecha);
                return fechaTurno.getMonth() === hoy.getMonth() &&
                    fechaTurno.getFullYear() === hoy.getFullYear();
            });
            break;
        }
        }
        
        // Filtro por estado — comparación case-insensitive (tabs HTML usan minusculas, modelo usa MAYUSCULAS)
        const filtroEstado = document.getElementById('filtro-estado')?.value;
        if (filtroEstado && filtroEstado !== 'todos') {
            turnosFiltrados = turnosFiltrados.filter(t =>
                t.estado.toLowerCase() === filtroEstado.toLowerCase()
            );
        }
        
        // Filtro por servicio
        const filtroServicio = document.getElementById('filtro-servicio')?.value;
        if (filtroServicio && filtroServicio !== 'todos') {
            turnosFiltrados = turnosFiltrados.filter(t => 
                t.servicio.toLowerCase().includes(filtroServicio.toLowerCase())
            );
        }
        
        // Filtro por búsqueda
        const busqueda = document.getElementById('buscar-turno')?.value?.toLowerCase();
        if (busqueda) {
            turnosFiltrados = turnosFiltrados.filter(t => 
                t.cliente.toLowerCase().includes(busqueda) ||
                t.telefono.includes(busqueda)
            );
        }
        
        return turnosFiltrados;
    }

    limpiarFiltros() {
        // Elementos básicos
        const elementosBasicos = {
            'filtro-fecha': 'todos',
            'filtro-estado': 'todos', 
            'filtro-servicio': 'todos',
            'buscar-turno': '',
            'filtro-fecha-desde': '',
            'filtro-fecha-hasta': ''
        };

        // Limpiar cada elemento con su valor por defecto
        Object.entries(elementosBasicos).forEach(([id, valorPorDefecto]) => {
            const elemento = document.getElementById(id);
            if (elemento) {
                elemento.value = valorPorDefecto;
                
                // Disparar evento change para elementos select
                if (elemento.tagName === 'SELECT') {
                    elemento.dispatchEvent(new Event('change'));
                }
            }
        });

        // Recargar los turnos
        this.cargarTurnosDesdeAPI()
            .then(() => {
                this.mostrarTurnos();
                NotificationService.show('Filtros limpiados correctamente');
            })
            .catch(error => {
                console.error('Error al recargar turnos:', error);
                NotificationService.showError('Error al recargar los turnos');
            });
    }

    async editarTurno(id) {
        this.turnoSeleccionado = this.turnosData.find(t => t.id === id);
        if (!this.turnoSeleccionado) return;
        
        // Llenar el modal con los datos del turno
        const campos = {
            'editarTurnoId': this.turnoSeleccionado.id,
            'editarFecha': this.turnoSeleccionado.fecha,
            'editarHora': this.turnoSeleccionado.hora,
            'editarNombre': this.turnoSeleccionado.cliente.split(' ')[0] || '',
            'editarApellido': this.turnoSeleccionado.cliente.split(' ')[1] || '',
            'editarTelefono': this.turnoSeleccionado.telefono,
            'editarEmail': this.turnoSeleccionado.email,
            'editarEstado': this.turnoSeleccionado.estado
        };

        Object.entries(campos).forEach(([id, value]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.value = value;
        });

        // Seleccionar el servicio
        const servicioId = this.serviciosDisponibles.find(s => 
            s.tipo === this.turnoSeleccionado.servicio
        )?.id || '';
        const selectServicio = document.getElementById('editarServicio');
        if (selectServicio) selectServicio.value = servicioId;

        // Actualizar horarios disponibles para la fecha del turno
        await this.actualizarHorariosDisponibles(this.turnoSeleccionado.fecha);
        
        // Mostrar el modal
        const modal = document.getElementById('modalEditarTurno');
        if (modal) {
            new bootstrap.Modal(modal).show();
        }
    }

    cargarHorarios() {
        const selectHora = document.getElementById('editarHora');
        if (!selectHora) return;
        const selectFecha = document.getElementById('editarFecha');

        // Solo cargar el placeholder inicial
        selectHora.innerHTML = '<option value="">Seleccione una fecha primero</option>';
        this.actualizarHorariosDisponibles(selectFecha.value);
    }

    async checkAvailability(fecha, hora) {
        try {
            const occupiedDates = await this.apiService.getOccupiedDates();
            const dateTimeToCheck = `${fecha}T${hora}`;
            
            return !occupiedDates.includes(dateTimeToCheck);
        } catch (error) {
            console.error('Error al verificar disponibilidad:', error);
            throw error;
        }
    }

    async validateDateTime(fecha, hora) {
        if (!fecha || !hora) return false;

        const isAvailable = await this.checkAvailability(fecha, hora);
        
        if (!isAvailable) {
            NotificationService.showError('El horario seleccionado no está disponible');
            return false;
        }

        return true;
    }

    
   async actualizarHorariosDisponibles(fecha) {
        if (!fecha) return;
        
        try {
            const occupiedDates = await this.apiService.getOccupiedDates();
            console.log('Fechas ocupadas:', occupiedDates);
            const selectHora = document.getElementById('editarHora');
            selectHora.innerHTML = '<option value="">Seleccionar hora</option>';
            
            // Filtrar horas ocupadas SOLO de la fecha seleccionada
            const ocupados = occupiedDates
                .filter(d => d.startsWith(fecha))
                .map(d => {
                    const fechaCompleta = new Date(d);
                    return fechaCompleta.toTimeString().slice(0, 5);
                });
            
            console.log('Fecha seleccionada:', fecha);
            console.log('Horarios ocupados para esta fecha:', ocupados);
            
            // Mostrar solo horarios disponibles
            let horariosDisponibles = [];
            HORARIOS_LABORALES.forEach(hora => {
                if (!ocupados.includes(hora)) {
                    horariosDisponibles.push(hora);
                    const selected = this.turnoSeleccionado?.hora === hora;
                    selectHora.add(new Option(hora, hora, selected, selected));
                }
            });
            
            console.log('Horarios disponibles agregados al select:', horariosDisponibles);
            console.log('Total opciones en el select:', selectHora.options.length);
            
            // Si no queda ninguna opción disponible
            if (selectHora.options.length === 1) {
                const opt = new Option("No hay horarios disponibles", "");
                opt.disabled = true;
                selectHora.add(opt);
            }
            
        } catch (err) {
            console.error('Error al actualizar horarios:', err);
            NotificationService.showError('Error al cargar horarios disponibles');
        }
    }



    async guardarEdicionTurno() {
        try {
        const id = parseInt(document.getElementById('editarTurnoId')?.value);
        if (!id) return;

        const fecha = document.getElementById('editarFecha')?.value;
        const hora = document.getElementById('editarHora')?.value;

        // Validar que haya fecha y hora seleccionadas
        if (!fecha || !hora) {
            NotificationService.showError('Debe seleccionar fecha y hora');
            return;
        }

        // Formatear correctamente la fecha y hora
        const fechaHora = `${fecha}T${hora}:00`;

        const servicioId = document.getElementById('editarServicio')?.value;
        const servicio = this.serviciosDisponibles.find(s => s.id == servicioId);
        
        if (!servicio) {
            NotificationService.showError('Debe seleccionar un servicio válido');
            return;
        }

        const apiData = {
            id: id,
            fechaHora: fechaHora,
            cliente: {
                nombre: document.getElementById('editarNombre')?.value || null,
                apellido: document.getElementById('editarApellido')?.value || null,
                email: null,
                telefono: document.getElementById('editarTelefono')?.value || null
            },
            servicio: {
                id: parseInt(servicioId),
                tipo: servicio.tipo,
                precio: servicio.precio
            }
        };

            // Actualizar en la API usando PATCH
            await this.apiService.patchTurno(id, apiData);
            
            // Actualizar en los datos locales
            const turnoIndex = this.turnosData.findIndex(t => t.id === id);
            if (turnoIndex !== -1) {
                this.turnosData[turnoIndex] = {
                    id: id,
                    fecha: document.getElementById('editarFecha')?.value,
                    hora: document.getElementById('editarHora')?.value,
                    cliente: `${apiData.cliente.nombre || ''} ${apiData.cliente.apellido || ''}`.trim(),
                    telefono: apiData.cliente.telefono || '',
                    servicio: servicio.tipo,
                    precio: servicio.precio,
                    estado: document.getElementById('editarEstado')?.value
                };
            }
                        
            // Cerrar modal y actualizar vista
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalEditarTurno'));
            if (modal) modal.hide();
            
            // Recargar los datos desde la API para asegurar consistencia
            await this.cargarTurnosDesdeAPI();
            
            if (this.vistaActual === 'lista') {
                this.mostrarTurnos();
            } else {
                this.generarCalendario();
            }
            
            NotificationService.show('Turno actualizado exitosamente');

        } catch (error) {
            console.error('Error al actualizar turno:', error);
            NotificationService.showError('Error al actualizar el turno');
        }
    }

    async cancelarTurno(id) {
        const turno = this.turnosData.find(t => t.id === id);
        if (!turno) return;
        
        const modalTexto = document.getElementById('modalAccionMensaje');
        if (modalTexto) {
            modalTexto.textContent = 
                `¿Estás seguro de que deseas eliminar el turno de ${turno.cliente} del ${new Date(turno.fecha).toLocaleDateString('es-ES')} a las ${turno.hora}?`;
        }
        
        const btnConfirmar = document.getElementById('btnConfirmarAccion');
        if (btnConfirmar) {
            btnConfirmar.onclick = async () => {
                try {
                    await this.apiService.deleteTurno(id);
                    
                    // Remover de los datos locales
                    this.turnosData = this.turnosData.filter(t => t.id !== id);
                    
                    if (this.vistaActual === 'lista') {
                        this.mostrarTurnos();
                    } else {
                        this.generarCalendario();
                    }
                    
                    const modal = bootstrap.Modal.getInstance(document.getElementById('modalConfirmarAccion'));
                    if (modal) modal.hide();
                    
                    NotificationService.show('Turno eliminado exitosamente');
                } catch (error) {
                    console.error('Error al eliminar turno:', error);
                    NotificationService.showError('Error al eliminar el turno');
                }
            };
        }
        
        const modal = document.getElementById('modalConfirmarAccion');
        if (modal) {
            new bootstrap.Modal(modal).show();
        }
    }

    // Funciones del calendario
    navegarMes(direccion) {
        this.fechaActualCalendario.setMonth(this.fechaActualCalendario.getMonth() + direccion);
        this.actualizarMesActual();
        this.generarCalendario();
    }

    actualizarMesActual() {
        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        const mesActual = document.getElementById('mes-actual');
        if (mesActual) {
            mesActual.textContent = 
                `${meses[this.fechaActualCalendario.getMonth()]} ${this.fechaActualCalendario.getFullYear()}`;
        }
    }

    generarCalendario() {
        // FIX: ID corregido de 'calendario-container' a 'calendario-grid'
        const container = document.getElementById('calendario-grid');
        if (!container) return;

        const year = this.fechaActualCalendario.getFullYear();
        const month = this.fechaActualCalendario.getMonth();

        const primerDia = new Date(year, month, 1);
        const ultimoDia = new Date(year, month + 1, 0);
        const diasEnMes = ultimoDia.getDate();
        const primerDiaSemana = primerDia.getDay();

        // Escribir directamente en #calendario-grid (que ya tiene la clase con display:grid)
        let html = '';

        // Encabezados de días
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        diasSemana.forEach(dia => {
            html += `<div class="calendario-header">${dia}</div>`;
        });

        // Días vacíos al inicio
        for (let i = 0; i < primerDiaSemana; i++) {
            html += '<div class="calendario-dia"></div>';
        }

        // Días del mes
        const hoyStr = new Date().toDateString();
        for (let dia = 1; dia <= diasEnMes; dia++) {
            const fechaDia = `${year}-${String(month + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const turnosDelDia = this.turnosData.filter(t => t.fecha === fechaDia);
            const esHoy = hoyStr === new Date(year, month, dia).toDateString();

            html += `
                <div class="calendario-dia${esHoy ? ' hoy' : ''}" onclick="seleccionarDia('${fechaDia}')">
                    <div class="text-white fw-bold mb-1" style="font-size:0.85rem;">${dia}</div>
                    ${turnosDelDia.map(t =>
                        `<div class="badge mb-1 d-block text-truncate" style="background:${this.getColorEstado(t.estado)};font-size:0.65rem;">${t.hora}</div>`
                    ).join('')}
                </div>
            `;
        }

        container.innerHTML = html;
    }

    getColorEstado(estado) {
        // FIX: estados en MAYUSCULAS (TurnoModel siempre devuelve uppercase)
        const colores = {
            'COMPLETADO': '#10b981',
            'PENDIENTE':  '#f59e0b',
            'CANCELADO':  '#ef4444',
            'NO_ASISTIO': '#94a3b8',
            // Compatibilidad con valores legados en minúsculas
            'confirmado': '#10b981',
            'pendiente':  '#f59e0b',
            'cancelado':  '#ef4444'
        };
        return colores[estado] || '#64748b';
    }

    seleccionarDia(fecha) {
        const turnosDelDia = this.turnosData.filter(t => t.fecha === fecha);
        // Construir fecha local para evitar desfase de zona horaria
        const [y, m, d] = fecha.split('-').map(Number);
        const fechaFormateada = new Date(y, m - 1, d).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // FIX: IDs correctos del HTML
        const detalleDia = document.getElementById('detalle-dia');
        if (detalleDia) detalleDia.style.display = 'block';

        const fechaSeleccionada = document.getElementById('detalle-dia-titulo');
        if (fechaSeleccionada) {
            fechaSeleccionada.textContent =
                fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
        }

        const container = document.getElementById('detalle-dia-turnos');
        if (!container) return;

        if (turnosDelDia.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No hay turnos para este día</p>';
        } else {
            container.innerHTML = turnosDelDia.map(turno => `
                <div class="card bg-secondary mb-2">
                    <div class="card-body p-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="card-title mb-1">${turno.hora} - ${turno.cliente}</h6>
                                <small class="text-muted">${turno.servicio}</small>
                            </div>
                            <div>
                                ${this.getEstadoBadge(turno.estado)}
                            </div>
                        </div>
                        <div class="mt-2">
                            <button class="btn btn-outline-warning btn-sm me-1" onclick="editarTurno(${turno.id})">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="cancelarTurno(${turno.id})">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    async cambiarEstadoTurno(id, estado) {
        if (!confirm(`¿Cambiar el estado del turno a "${estado}"?`)) return;
        try {
            await this.apiService.updateEstadoTurno(id, estado);
            NotificationService.show(`Estado actualizado a ${estado}`, 'success');
            await this.cargarTurnosDesdeAPI();
            this.mostrarTurnos();
        } catch (error) {
            console.error('Error al cambiar estado:', error);
            NotificationService.showError('Error al actualizar el estado del turno.');
        }
    }

    // Método público para refrescar datos
    async refreshData() {
        try {
            await this.cargarTurnosDesdeAPI();
            if (this.vistaActual === 'lista') {
                this.mostrarTurnos();
            } else {
                this.generarCalendario();
            }
            NotificationService.show('Datos actualizados correctamente');
        } catch (error) {
            console.error('Error al refrescar datos:', error);
            NotificationService.showError('Error al actualizar los datos');
        }
    }
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar que Bootstrap esté disponible
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap no está cargado');
        return;
    }

    // BUG #1 FIX: Guard the entire init block with requireAuth().
    // requireAuth() reads getBarberiaSession() (sessionStorage + localStorage fallback).
    // If no valid session exists it immediately redirects to login via window.location.replace()
    // and returns null, stopping TurnosManager from being constructed with a null barberiaId
    // (which was the source of the "No session" throws and the subsequent redirect loop).
    const _authSession = requireAuth();
    if (!_authSession) return; // requireAuth already redirected to login

    const fechaInput = document.getElementById('editarFecha');
    if (fechaInput) fechaInput.min = new Date().toISOString().split('T')[0];

    // Inicializar la aplicación
    window.turnosManager = new TurnosManager();

    // Agregar estilos CSS adicionales
    const style = document.createElement('style');
    style.textContent = `
        .vista-activa { display: block !important; }
        .vista-oculta { display: none !important; }
        .sidebar-nav-item.active { background: var(--primary) !important; color: #fff !important; }
        .loading { opacity: 0.6; pointer-events: none; }
    `;
    document.head.appendChild(style);

    // ── Exponer TODAS las funciones globales ──────────────────────────────────
    window.refreshTurnos          = () => window.turnosManager?.refreshData();
    window.cambiarVista           = (v) => {
        // Actualizar botones del sidebar
        ['lista','calendario','configuracion'].forEach(n => {
            document.getElementById('nav-' + n)?.classList.remove('active');
        });
        document.getElementById('nav-' + v)?.classList.add('active');

        // Mostrar/ocultar secciones
        ['lista','calendario','configuracion'].forEach(n => {
            const el = document.getElementById('vista-' + n);
            if (el) el.className = (n === v) ? 'vista-activa' : 'vista-oculta';
        });

        // Cargar contenido
        if (v === 'lista')       window.turnosManager?.mostrarTurnos();
        if (v === 'calendario')  window.turnosManager?.generarCalendario();
        if (v === 'configuracion') cargarConfiguracion();
    };
    window.navegarMes             = (d)  => window.turnosManager?.navegarMes(d);
    window.seleccionarDia         = (f)  => window.turnosManager?.seleccionarDia(f);
    window.editarTurno            = (id) => window.turnosManager?.editarTurno(id);
    window.cancelarTurno          = (id) => window.turnosManager?.cancelarTurno(id);
    window.cambiarEstadoTurno     = (id, estado) => window.turnosManager?.cambiarEstadoTurno(id, estado);
    window.guardarEdicionTurno    = ()   => window.turnosManager?.guardarEdicionTurno();
    window.aplicarFiltros         = ()   => window.turnosManager?.aplicarFiltros();
    window.limpiarFiltros         = ()   => window.turnosManager?.limpiarFiltros();

    // ── Configuración: cargar y guardar horarios ──────────────────────────────
    async function cargarConfiguracion() {
        try {
            // FIX: usar getBarberiaSession() para soportar "recuérdame" (localStorage fallback)
            const session = getBarberiaSession();
            if (!session) return;
            const { slug } = session;
            const { API_BASE_URL } = await import('./config.js');
            const res = await fetch(`${API_BASE_URL}/barberias/slug/${slug}`);
            if (!res.ok) return;
            const data = await res.json();
            const horaInicio = document.getElementById('configHoraInicio');
            const horaFin    = document.getElementById('configHoraFin');
            const intervalo  = document.getElementById('configIntervalo');
            const telefono   = document.getElementById('configTelefono');
            const logoUrl    = document.getElementById('configLogoUrl');
            const bannerUrl  = document.getElementById('configBannerUrl');
            if (horaInicio) horaInicio.value = data.horaInicio || '09:00';
            if (horaFin)    horaFin.value    = data.horaFin    || '18:00';
            if (intervalo)  intervalo.value  = String(data.intervaloMinutos || 30);
            if (telefono)   telefono.value   = data.telefono   || '';
            if (logoUrl)    logoUrl.value    = data.logoUrl    || '';
            if (bannerUrl)  bannerUrl.value  = data.bannerUrl  || '';
            // Mostrar preview del logo si existe
            if (data.logoUrl) actualizarPreviewLogo(data.logoUrl);
        } catch(e) { console.error('Error al cargar config:', e); }
    }

    function actualizarPreviewLogo(url) {
        const preview = document.getElementById('brandingPreview');
        const img = document.getElementById('previewLogoImg');
        if (preview && img && url) { img.src = url; preview.style.display = 'block'; }
        else if (preview) { preview.style.display = 'none'; }
    }

    // Preview en tiempo real al escribir URL del logo
    document.getElementById('configLogoUrl')?.addEventListener('input', (e) => actualizarPreviewLogo(e.target.value));

    const formConfig = document.getElementById('formConfiguracion');
    if (formConfig) {
        formConfig.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                // FIX: usar getBarberiaSession() para soportar "recuérdame"
                const session = getBarberiaSession();
                if (!session) return;
                const { id } = session;
                const payload = {
                    horaInicio:       document.getElementById('configHoraInicio')?.value,
                    horaFin:          document.getElementById('configHoraFin')?.value,
                    intervaloMinutos: Number(document.getElementById('configIntervalo')?.value),
                    telefono:         document.getElementById('configTelefono')?.value,
                };
                const { getAuthHeaders, API_BASE_URL } = await import('./config.js');
                const res = await fetch(`${API_BASE_URL}/barberias/${id}/config`, {
                    method: 'PATCH',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                if (!res.ok) throw new Error('Error al guardar');
                localStorage.setItem('barberiaConfig_' + id, JSON.stringify(payload));
                const btn = document.getElementById('btnGuardarConfig');
                if (btn) { btn.textContent = '✅ Guardado!'; setTimeout(() => btn.textContent = 'Guardar Cambios', 2000); }
            } catch(e) { 
                console.error('Error al guardar config:', e); 
                alert('❌ Error al guardar la configuración. Intentalo de nuevo.');
            }
        });
    }

    // FIX: exponer sortTable al window para los onclick de los <th>
    window.sortTable = sortTable;

    // Activar Vista Lista por defecto
    window.cambiarVista('lista');
});

// <-- Script Refactor -->
// Funciones adicionales para la interfaz
    function toggleAdvancedFilters() {
      const advancedFilters = document.getElementById('advanced-filters');
      if (advancedFilters) {
        advancedFilters.classList.toggle('d-none');
      }
    }

    function applyAdvancedFilters() {
      if (!window.turnosManager) return;
      
      const criteria = {
        precioMinimo: document.getElementById('filtro-precio-min')?.value,
        precioMaximo: document.getElementById('filtro-precio-max')?.value,
        cliente: document.getElementById('filtro-cliente')?.value,
        // Agregar otros criterios según sea necesario
      };

      const results = window.turnosManager.advancedSearch(criteria);
      // Mostrar resultados filtrados
      window.turnosManager.turnosData = results;
      window.turnosManager.mostrarTurnos();
    }

    function updatePrecio() {
      const servicioSelect = document.getElementById('editarServicio');
      const precioInput = document.getElementById('editarPrecio');
      const previewElement = document.getElementById('preview-turno');
      
      if (!servicioSelect || !precioInput || !window.turnosManager) return;

      const servicioId = servicioSelect.value;
      const servicio = window.turnosManager.serviciosDisponibles.find(s => s.id == servicioId);
      
      if (servicio) {
        precioInput.value = servicio.precio;
        updatePreview();
      } else {
        precioInput.value = '';
      }
    }

    function updatePreview() {
      const previewElement = document.getElementById('preview-turno');
      if (!previewElement) return;

      const fecha = document.getElementById('editarFecha')?.value;
      const hora = document.getElementById('editarHora')?.value;
      const nombre = document.getElementById('editarNombre')?.value;
      const apellido = document.getElementById('editarApellido')?.value;
      const servicio = document.getElementById('editarServicio')?.selectedOptions[0]?.text;
      const precio = document.getElementById('editarPrecio')?.value;

        if (fecha && hora && nombre && servicio) {
        // Corregir el problema de la fecha
        const [year, month, day] = fecha.split("-");
        const fechaFormateada = new Date(
            year,
            month - 1,
            parseInt(day)
        ).toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });

        previewElement.innerHTML = `
                <strong>${nombre} ${apellido}</strong><br>
                ${fechaFormateada} a las ${hora}<br>
                <em>${servicio}</em><br>
            `;
        } else {
        previewElement.textContent =
            "Complete los datos para ver la vista previa";
        }
    }

    function goToToday() {
      if (!window.turnosManager) return;
      
      window.turnosManager.fechaActualCalendario = new Date();
      window.turnosManager.actualizarMesActual();
      window.turnosManager.generarCalendario();
      
      // Seleccionar el día de hoy automáticamente
      const today = new Date();
      const todayString = today.toISOString().split('T')[0];
      window.seleccionarDia(todayString);
    }

    function sortTable(column) {
      if (!window.turnosManager) return;
      
      // Implementar ordenamiento
      const isAsc = window.turnosManager.sortDirection !== 'asc';
      window.turnosManager.sortDirection = isAsc ? 'asc' : 'desc';
      window.turnosManager.sortColumn = column;
      
      window.turnosManager.turnosData.sort((a, b) => {
        let aValue = a[column];
        let bValue = b[column];
        
        if (column === 'precio') {
          aValue = parseFloat(aValue) || 0;
          bValue = parseFloat(bValue) || 0;
        } else if (column === 'fecha') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }
        
        if (aValue < bValue) return isAsc ? -1 : 1;
        if (aValue > bValue) return isAsc ? 1 : -1;
        return 0;
      });
      
      window.turnosManager.mostrarTurnos();
    }

    function limpiarBusquedaAvanzada() {
      const form = document.getElementById('formBusquedaAvanzada');
      if (form) {
        form.reset();
      }
    }

    function ejecutarBusquedaAvanzada() {
      if (!window.turnosManager) return;
      
      const criteria = {
        fechaDesde: document.getElementById('searchFechaDesde')?.value,
        fechaHasta: document.getElementById('searchFechaHasta')?.value,
        cliente: document.getElementById('searchCliente')?.value,
        servicio: document.getElementById('searchServicio')?.value,
        precioMinimo: document.getElementById('searchPrecioMin')?.value,
        precioMaximo: document.getElementById('searchPrecioMax')?.value,
        estado: document.getElementById('searchEstado')?.value
      };

      const results = window.turnosManager.advancedSearch(criteria);
      
      // Crear una vista temporal con los resultados
      const originalData = [...window.turnosManager.turnosData];
      window.turnosManager.turnosData = results;
      window.turnosManager.mostrarTurnos();
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalBusquedaAvanzada'));
      if (modal) modal.hide();
      
      // Mostrar botón para restaurar vista
      showRestoreButton(originalData);
    }

    function showRestoreButton(originalData) {
      const existingButton = document.getElementById('restore-view-btn');
      if (existingButton) existingButton.remove();
      
      const button = document.createElement('button');
      button.id = 'restore-view-btn';
      button.className = 'btn btn-outline-warning btn-sm';
      button.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>Mostrar todos los turnos';
      button.onclick = () => {
        if (window.turnosManager) {
          window.turnosManager.turnosData = originalData;
          window.turnosManager.mostrarTurnos();
          button.remove();
        }
      };
      
      const totalTurnos = document.getElementById('total-turnos');
      if (totalTurnos && totalTurnos.parentNode) {
        totalTurnos.parentNode.insertBefore(button, totalTurnos.nextSibling);
      }
    }

    // Event listeners para actualización en tiempo real del preview
    document.addEventListener('DOMContentLoaded', function() {
      // Agregar listeners para la vista previa
      const fieldsToWatch = ['editarFecha', 'editarHora', 'editarNombre', 'editarServicio'];
      fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
          field.addEventListener('change', updatePreview);
          field.addEventListener('input', updatePreview);
        }
      });
    });

    window.mostrarModalBloqueo = function() {
        const modal = document.getElementById('modalBloqueo');
        if (modal) {
            document.getElementById('bloqueo-fecha').value = new Date().toISOString().split('T')[0];
            document.getElementById('bloqueo-hora').value = '';
            document.getElementById('bloqueo-motivo').value = 'Descanso';
            new bootstrap.Modal(modal).show();
        }
    };

    window.mostrarModalIngreso = function() {
        const modal = document.getElementById('modalIngreso');
        if (modal) {
            document.getElementById('ingreso-fecha').value = new Date().toISOString().split('T')[0];
            const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
            document.getElementById('ingreso-hora').value = time;
            document.getElementById('ingreso-descripcion').value = '';
            document.getElementById('ingreso-monto').value = '';
            new bootstrap.Modal(modal).show();
        }
    };

    window.guardarBloqueo = async function() {
        const fecha = document.getElementById('bloqueo-fecha').value;
        const hora = document.getElementById('bloqueo-hora').value || "00:00";
        const motivo = document.getElementById('bloqueo-motivo').value || "Bloqueo";
        
        if (!fecha) {
            NotificationService.showError("Selecciona una fecha.");
            return;
        }

        const session = sessionStorage.getItem('barberia_admin');
        const bId = session ? JSON.parse(session).id : 1;

        const payload = {
            fechaHora: `${fecha}T${hora}:00`,
            cliente: { nombre: "BLOQUEO", apellido: motivo, telefono: "0000000000", email: "bloqueo@local.com" },
            barberia: { id: bId }
        };

        try {
            const res = await fetch(`${API_BASE_URL}/turnos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Error al crear bloqueo");
            
            NotificationService.show("Horario bloqueado con éxito", "success");
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalBloqueo'));
            if (modal) modal.hide();
            if (window.turnosManager) window.turnosManager.refreshData();
        } catch (e) {
            console.error(e);
            NotificationService.showError("Hubo un error al bloquear el horario");
        }
    };

    window.guardarIngreso = async function() {
        const fecha = document.getElementById('ingreso-fecha').value;
        const hora = document.getElementById('ingreso-hora').value;
        const descripcion = document.getElementById('ingreso-descripcion').value;
        const monto = parseFloat(document.getElementById('ingreso-monto').value);

        if (!fecha || !hora || !descripcion || isNaN(monto)) {
            NotificationService.showError("Completa todos los campos correctamente.");
            return;
        }

        const session = sessionStorage.getItem('barberia_admin');
        const bId = session ? JSON.parse(session).id : 1;

        // Utilizamos el mismo endpoint de reservas pero marcamos cliente genérico y creamos un servicio on-the-fly
        // (O usamos un ID de servicio dummy si lo tuviéramos, pero el backend guarda el servicio anidado o lo enlaza si existe)
        // Por simplicidad, mandamos el payload genérico. El servicio es opcional en la reserva ahora.
        
        const payload = {
            fechaHora: `${fecha}T${hora}:00`,
            cliente: { nombre: "INGRESO MANUAL", apellido: descripcion, telefono: "0000000000", email: "ingreso@local.com" },
            barberia: { id: bId },
            servicio: { tipo: descripcion, precio: monto }
        };

        try {
            const res = await fetch(`${API_BASE_URL}/turnos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Error al registrar ingreso");
            
            NotificationService.show("Ingreso registrado con éxito", "success");
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalIngreso'));
            if (modal) modal.hide();
            if (window.turnosManager) window.turnosManager.refreshData();
        } catch (e) {
            console.error(e);
            NotificationService.showError("Hubo un error al registrar el ingreso");
        }
    };


    // Reemplazar la clase NotificationService original
    if (typeof window !== 'undefined') {
      window.NotificationService = NotificationService;
    }