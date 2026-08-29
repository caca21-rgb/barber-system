import { API_BASE_URL } from '../js/config.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Verificar sesión
  const session = sessionStorage.getItem('superadmin');
  if (!session) {
    window.location.href = './access.html';
    return;
  }
  const credentials = JSON.parse(session);
  document.getElementById('adminEmail').textContent = credentials.email;

  // 2. Elementos del DOM
  const tableBody = document.getElementById('tableBody');
  const searchBar = document.getElementById('searchBar');
  const btnLogout = document.getElementById('logoutBtn');
  const btnCrear = document.getElementById('btnCrear');
  const btnGuardarEdicion = document.getElementById('btnGuardarEdicion');

  // Modal y Toasts (Bootstrap)
  const modalNueva = new bootstrap.Modal(document.getElementById('modalNueva'));
  const modalEditar = new bootstrap.Modal(document.getElementById('modalEditar'));
  const toastEl = document.getElementById('toastMsg');
  const toast = new bootstrap.Toast(toastEl);

  let barberiasData = [];

  // 3. Funciones principales
  const headers = {
    'Content-Type': 'application/json',
    'X-SuperAdmin-Email': credentials.email,
    'X-SuperAdmin-Password': credentials.password
  };

  async function cargarBarberias() {
    try {
      // Como el endpoint GET /barberias es del GenericController, lo usamos directamente.
      // (Podríamos protegerlo también en el futuro).
      const res = await fetch(`${API_BASE_URL}/barberias`);
      if (res.ok) {
        barberiasData = await res.json();
        renderTable(barberiasData);
        updateStats(barberiasData);
      }
    } catch (error) {
      console.error('Error cargando barberias:', error);
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error de conexión</td></tr>`;
    }
  }

  function renderTable(data) {
    tableBody.innerHTML = '';
    if (data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">No hay barberías registradas.</td></tr>`;
      return;
    }

    data.forEach(b => {
      const isActiva = b.activa;
      const estadoBadge = isActiva 
        ? `<span class="badge-activa">Activa</span>` 
        : `<span class="badge-inactiva">Suspendida</span>`;
      
      const toggleBtn = isActiva
        ? `<button class="btn-sm-danger" onclick="window.toggleEstado(${b.id}, false)">Desactivar</button>`
        : `<button class="btn-sm-accent" onclick="window.toggleEstado(${b.id}, true)">Activar</button>`;

      const editBtn = `<button class="btn-sm-accent ms-1" onclick="window.abrirEditar(${b.id})"><i class="bi bi-pencil"></i> Editar</button>`;

      const tr = document.createElement('tr');
      // Calcula la URL base de forma dinamica para soportar GitHub Pages
      // con subcarpeta (ej. /barber-system/) y dominios propios en la raiz.
      // GitHub Pages sirve el directorio sin "index.html" en pathname,
      // por eso se normaliza la barra final y se quita solo 1 segmento.
      const _pathname = window.location.pathname.replace(/\/$/, '');
      const pathSegments = _pathname.split('/').filter(Boolean);
      const basePath = pathSegments.slice(0, -1).join('/');
      const reservaBaseUrl = `${window.location.origin}${basePath ? '/' + basePath : ''}/index.html`;

      tr.innerHTML = `
        <td class="text-muted">#${b.id}</td>
        <td class="fw-bold text-white">${b.nombreNegocio}</td>
        <td><a href="${reservaBaseUrl}?slug=${b.slug}" target="_blank" class="text-decoration-none" style="color:#3291FF;">${b.slug}</a></td>
        <td>${b.email}</td>
        <td class="text-muted">${b.planVencimiento || 'Sin fecha'}</td>
        <td>${estadoBadge}</td>
        <td class="d-flex gap-1 flex-wrap">${toggleBtn}${editBtn}</td>
      `;
      tableBody.appendChild(tr);

    });
  }

  function updateStats(data) {
    const total = data.length;
    const activas = data.filter(b => b.activa).length;
    const inactivas = total - activas;

    document.getElementById('statTotal').textContent = total;
    document.getElementById('statActivas').textContent = activas;
    document.getElementById('statInactivas').textContent = inactivas;
  }

  function showToast(msg, isError = false) {
    document.getElementById('toastBody').textContent = msg;
    toastEl.className = `toast align-items-center text-bg-${isError ? 'danger' : 'success'} border-0`;
    toast.show();
  }

  // 4. Eventos
  
  // Búsqueda en vivo
  searchBar.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtradas = barberiasData.filter(b => 
      b.nombreNegocio.toLowerCase().includes(term) || 
      b.slug.toLowerCase().includes(term) ||
      b.email.toLowerCase().includes(term)
    );
    renderTable(filtradas);
  });

  // Crear nueva barbería
  btnCrear.addEventListener('click', async () => {
    const errorDiv = document.getElementById('formError');
    errorDiv.classList.add('d-none');

    const nombreNegocio = document.getElementById('fNombre').value.trim();
    const slug = document.getElementById('fSlug').value.trim().toLowerCase();
    const email = document.getElementById('fEmail').value.trim();
    const contrasenia = document.getElementById('fPassword').value;
    const telefono = document.getElementById('fTelefono').value.trim();
    const planVencimiento = document.getElementById('fVencimiento').value || null;

    if (!nombreNegocio || !slug || !email || !contrasenia) {
      errorDiv.textContent = 'Por favor completa los campos obligatorios (*).';
      errorDiv.classList.remove('d-none');
      return;
    }

    const payload = {
      nombreNegocio, slug, email, contrasenia, telefono, planVencimiento, activa: true
    };

    try {
      btnCrear.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creando...';
      btnCrear.disabled = true;

      const res = await fetch(`${API_BASE_URL}/barberias`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Barbería creada exitosamente.');
        modalNueva.hide();
        // Limpiar form
        document.querySelectorAll('.form-control').forEach(i => i.value = '');
        cargarBarberias();
      } else {
        errorDiv.textContent = 'Error al crear la cuenta (quizás el email o slug ya existen).';
        errorDiv.classList.remove('d-none');
      }
    } catch (error) {
      errorDiv.textContent = 'Error de conexión.';
      errorDiv.classList.remove('d-none');
    } finally {
      btnCrear.innerHTML = '<i class="bi bi-check-lg me-1"></i>Crear cuenta';
      btnCrear.disabled = false;
    }
  });

  // Guardar edición
  btnGuardarEdicion.addEventListener('click', async () => {
    const editErrorDiv = document.getElementById('editFormError');
    editErrorDiv.classList.add('d-none');

    const id = document.getElementById('eId').value;
    const nombreNegocio = document.getElementById('eNombre').value.trim();
    const slug = document.getElementById('eSlug').value.trim().toLowerCase();
    const email = document.getElementById('eEmail').value.trim();
    const contrasenia = document.getElementById('ePassword').value;
    const telefono = document.getElementById('eTelefono').value.trim();
    const planVencimiento = document.getElementById('eVencimiento').value || null;

    if (!nombreNegocio || !slug || !email) {
      editErrorDiv.textContent = 'Nombre, slug y email son obligatorios.';
      editErrorDiv.classList.remove('d-none');
      return;
    }

    const payload = { nombreNegocio, slug, email, telefono, planVencimiento };
    if (contrasenia) payload.contrasenia = contrasenia;

    try {
      btnGuardarEdicion.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
      btnGuardarEdicion.disabled = true;

      const res = await fetch(`${API_BASE_URL}/barberias/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToast('Cambios guardados correctamente.');
        modalEditar.hide();
        cargarBarberias();
      } else {
        const msg = await res.text();
        editErrorDiv.textContent = msg || 'Error al guardar los cambios.';
        editErrorDiv.classList.remove('d-none');
      }
    } catch (err) {
      editErrorDiv.textContent = 'Error de conexión.';
      editErrorDiv.classList.remove('d-none');
    } finally {
      btnGuardarEdicion.innerHTML = '<i class="bi bi-check-lg me-1"></i>Guardar cambios';
      btnGuardarEdicion.disabled = false;
    }
  });

  // Logout
  btnLogout.addEventListener('click', () => {
    sessionStorage.removeItem('superadmin');
    window.location.href = './access.html';
  });

  // Funciones globales para botones dinámicos en la tabla
  window.abrirEditar = (id) => {
    const b = barberiasData.find(x => x.id === id);
    if (!b) return;
    document.getElementById('eId').value = b.id;
    document.getElementById('eNombre').value = b.nombreNegocio || '';
    document.getElementById('eSlug').value = b.slug || '';
    document.getElementById('eEmail').value = b.email || '';
    document.getElementById('ePassword').value = '';
    document.getElementById('eTelefono').value = b.telefono || '';
    document.getElementById('eVencimiento').value = b.planVencimiento || '';
    document.getElementById('editFormError').classList.add('d-none');
    modalEditar.show();
  };

  window.toggleEstado = async (id, activar) => {
    const action = activar ? 'activar' : 'desactivar';
    try {
      const res = await fetch(`${API_BASE_URL}/barberias/${id}/${action}`, {
        method: 'PATCH',
        headers
      });
      if (res.ok) {
        showToast(`Cuenta ${activar ? 'activada' : 'suspendida'} correctamente.`);
        cargarBarberias();
      } else {
        showToast('Error al cambiar el estado.', true);
      }
    } catch (err) {
      showToast('Error de conexión.', true);
    }
  };

  // Inicializar
  cargarBarberias();
});
