import { ENDPOINTS, getAuthHeaders, requireAuth, clearBarberiaSession, ADMIN_LOGIN_URL } from './config.js';

let barberiaId = null;
let modalInstancia = null;

document.addEventListener('DOMContentLoaded', () => {
    // Verificar sesión admin
    const session = requireAuth();
    if (!session) return; // requireAuth ya hizo el redirect

    barberiaId = session.id;
    
    document.getElementById('sidebarBarberName').textContent = session.nombreNegocio || localStorage.getItem('adminNombre') || 'Admin Panel';

    // Sidebar overlay para móvil
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('open');
        document.getElementById('sidebarOverlay').classList.add('show');
    });
    
    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('sidebarOverlay').classList.remove('show');
    });

    document.getElementById('btnLogout')?.addEventListener('click', (e) => {
        e.preventDefault();
        clearBarberiaSession();
        window.location.replace(ADMIN_LOGIN_URL);
    });

    modalInstancia = new bootstrap.Modal(document.getElementById('modalServicio'));
    
    cargarServicios();
});

async function cargarServicios() {
    try {
        const res = await fetch(`${ENDPOINTS.servicios}/barberia/${barberiaId}`, {
            headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error('No autorizado');
        const servicios = await res.json();
        
        const tbody = document.getElementById('tabla-servicios');
        tbody.innerHTML = '';
        
        if (servicios.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">No hay servicios registrados</td></tr>`;
            return;
        }

        servicios.forEach(s => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${s.tipo}</strong></td>
                <td class="font-mono text-success">$${s.precio.toLocaleString()}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-warning mx-1" onclick="editarServicio(${s.id}, '${s.tipo.replace(/'/g, "\\'")}', ${s.precio})" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="eliminarServicio(${s.id})" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (e) {
        console.error(e);
        alert('Error al cargar servicios. Verifica tu sesión.');
    }
}

window.abrirModalServicio = () => {
    document.getElementById('formServicio').reset();
    document.getElementById('servicioId').value = '';
    document.getElementById('modalTitle').textContent = 'Nuevo Servicio';
    modalInstancia.show();
};

window.editarServicio = (id, tipo, precio) => {
    document.getElementById('servicioId').value = id;
    document.getElementById('servicioNombre').value = tipo;
    document.getElementById('servicioPrecio').value = precio;
    document.getElementById('modalTitle').textContent = 'Editar Servicio';
    modalInstancia.show();
};

window.guardarServicio = async () => {
    const id = document.getElementById('servicioId').value;
    const tipo = document.getElementById('servicioNombre').value.trim();
    const precio = parseFloat(document.getElementById('servicioPrecio').value);

    if (!tipo || isNaN(precio) || precio < 0) {
        alert('Por favor, ingresa datos válidos');
        return;
    }

    const payload = {
        tipo,
        precio,
        barberia: { id: barberiaId }
    };

    try {
        let res;
        if (id) {
            // Actualizar
            res = await fetch(`${ENDPOINTS.servicios}/${id}`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        } else {
            // Crear
            res = await fetch(ENDPOINTS.servicios, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        if (res.ok) {
            modalInstancia.hide();
            cargarServicios();
        } else {
            alert('Error al guardar el servicio');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
};

window.eliminarServicio = async (id) => {
    if (!confirm('¿Seguro que querés eliminar este servicio? No podrás deshacer esta acción.')) return;
    
    try {
        const res = await fetch(`${ENDPOINTS.servicios}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        if (res.ok) {
            cargarServicios();
        } else {
            alert('Error al eliminar. Puede que el servicio tenga turnos asociados.');
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión');
    }
};
