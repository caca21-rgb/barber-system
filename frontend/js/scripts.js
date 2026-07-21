import { ENDPOINTS, getSlugFromUrl, getBarberiaSession } from "./config.js";

// ── Estado global ──────────────────────────────────────────
const regexTelefono = /^[0-9]{7,15}$/;
const regexEmail    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let barberiaInfo      = null; // { id, slug, horaInicio, horaFin, intervaloMinutos }
let turnosOcupadosMap = {};

// ── API ────────────────────────────────────────────────────
const API = {
  async obtenerInfoBarberia() {
    const slug = getSlugFromUrl();
    if (!slug) throw new Error("No hay slug en la URL");
    const res = await fetch(`${ENDPOINTS.barberias}/slug/${slug}`);
    if (!res.ok) throw new Error("Barbería no encontrada");
    return await res.json(); // { id, slug, nombreNegocio, horaInicio, horaFin, intervaloMinutos }
  },

  async obtenerTurnosOcupados(barberiaId) {
    try {
      const slug = getSlugFromUrl();
      if (!slug) return [];
      const res = await fetch(`${ENDPOINTS.barberias}/slug/${slug}/turnos/ocupados`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      console.error(e);
      return [];
    }
  },

  async reservarTurno(payload) {
    const res = await fetch(ENDPOINTS.turnos, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const msg = await res.text().catch(() => "Error desconocido");
      throw new Error(msg);
    }
    return res;
  },
};

// ── Helpers ────────────────────────────────────────────────
function mapearTurnosOcupados(arr) {
  const mapa = {};
  arr.forEach(item => {
    // item puede ser "2026-07-18T10:00" o "2026-07-18T10:00:00"
    const [fecha, horaRaw] = item.split("T");
    const hora = horaRaw ? horaRaw.substring(0, 5) : "";
    if (!mapa[fecha]) mapa[fecha] = [];
    mapa[fecha].push(hora);
  });
  return mapa;
}

function generarFranjasHorarias(horaInicio, horaFin, intervalo) {
  const franjas = [];
  const [hIni, mIni] = horaInicio.split(":").map(Number);
  const [hFin, mFin] = horaFin.split(":").map(Number);
  let minutos = hIni * 60 + mIni;
  const finMin = hFin * 60 + mFin;
  while (minutos < finMin) {
    const h = String(Math.floor(minutos / 60)).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");
    franjas.push(`${h}:${m}`);
    minutos += intervalo;
  }
  return franjas;
}

function mostrarError(msg) {
  const el = document.getElementById("modalErrorMensaje");
  if (el) el.textContent = msg;
  const modalEl = document.getElementById("modalError");
  if (modalEl) {
    const m = new bootstrap.Modal(modalEl);
    m.show();
  } else {
    alert(msg);
  }
}
window.mostrarError = mostrarError;

// ── PASO 1: Fecha/Hora — cargar slots dinámicamente ────────
window.cargarHorariosDisponibles = function () {
  const inputFecha = document.getElementById("fecha");
  const contenedor = document.getElementById("horarios");
  if (!inputFecha || !contenedor) return;

  const fecha = inputFecha.value;
  contenedor.innerHTML = "";
  if (!fecha || !barberiaInfo) return;

  const ini      = barberiaInfo.horaInicio      || "09:00";
  const fin      = barberiaInfo.horaFin         || "18:00";
  const intervalo = barberiaInfo.intervaloMinutos || 30;

  // Leer también de localStorage si el barbero guardó config local
  try {
    const localCfg = localStorage.getItem("barberiaConfig_" + barberiaInfo.id);
    if (localCfg) {
      const cfg = JSON.parse(localCfg);
      if (cfg.horaInicio) barberiaInfo.horaInicio = cfg.horaInicio;
      if (cfg.horaFin)    barberiaInfo.horaFin    = cfg.horaFin;
      if (cfg.intervaloMinutos) barberiaInfo.intervaloMinutos = cfg.intervaloMinutos;
    }
  } catch (_) {}

  const todasFranjas = generarFranjasHorarias(
    barberiaInfo.horaInicio,
    barberiaInfo.horaFin,
    barberiaInfo.intervaloMinutos
  );

  const ocupados = turnosOcupadosMap[fecha] || [];
  const libres   = todasFranjas.filter(h => !ocupados.includes(h));

  if (libres.length === 0) {
    contenedor.innerHTML = `<p class="text-warning small mt-2"><i class="bi bi-calendar-x me-1"></i>No hay turnos disponibles para esta fecha. Probá con otra.</p>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  libres.forEach(hora => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "slot-horario input-opcion";
    btn.textContent = hora;
    btn.addEventListener("click", () => {
      document.querySelectorAll(".slot-horario, .input-opcion").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
    fragment.appendChild(btn);
  });
  contenedor.appendChild(fragment);
};

// ── Validaciones ───────────────────────────────────────────
window.validarPaso = function (paso) {
  if (paso === 1) {
    const fecha = document.getElementById("fecha")?.value;
    if (!fecha) {
      mostrarError("Por favor, seleccioná una fecha.");
      return false;
    }
    const horarioSeleccionado = document.querySelector(".slot-horario.selected, .input-opcion.selected");
    if (!horarioSeleccionado) {
      mostrarError("Por favor, seleccioná un horario disponible.");
      return false;
    }
    return true;
  }
  return true;
};

// ── Envío del formulario ───────────────────────────────────
window.enviarForm = async function () {
  const nombre   = document.getElementById("nombre")?.value.trim();
  const apellido = document.getElementById("apellido")?.value.trim();
  const telefono = document.getElementById("telefono")?.value.trim();
  const email    = document.getElementById("email")?.value.trim();
  const fecha    = document.getElementById("fecha")?.value;
  const horaEl   = document.querySelector(".slot-horario.selected, .input-opcion.selected");
  const hora     = horaEl?.textContent?.trim() || "";

  if (!nombre || !apellido || !telefono || !email) {
    mostrarError("Por favor, completá todos los campos de datos personales.");
    return;
  }
  if (!fecha || !hora) {
    mostrarError("Por favor, seleccioná fecha y horario.");
    return;
  }
  if (!regexTelefono.test(telefono)) {
    mostrarError("Ingresá un teléfono válido (solo números, 7-15 dígitos).");
    return;
  }
  if (!regexEmail.test(email)) {
    mostrarError("Ingresá un correo electrónico válido.");
    return;
  }
  if (!barberiaInfo?.id) {
    mostrarError("Error: no se pudo identificar la barbería.");
    return;
  }

  const payload = {
    fechaHora: `${fecha}T${hora}:00`,
    cliente:   { nombre, apellido, telefono, email },
    barberia:  { id: barberiaInfo.id },
    // servicio: null — ya no es obligatorio
  };

  const btn = document.getElementById("btnReservar");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status"></span> Reservando...';
  }

  try {
    await API.reservarTurno(payload);
    if (typeof window.mostrarExito === "function") {
      window.mostrarExito("Reserva General", fecha, hora);
    } else {
      window.location.href = "reserva-confirmada.html";
    }
  } catch (err) {
    console.error(err);
    
    // Si el mensaje viene como JSON de Spring Boot (ej. IllegalArgumentException)
    let errorMsg = err.message;
    try {
        const json = JSON.parse(err.message);
        if (json.message) errorMsg = json.message;
    } catch (e) { }

    if (errorMsg.includes("Ya existe un turno") || errorMsg.includes("inválido")) {
        mostrarError("Ese horario acaba de ser ocupado o es inválido. Por favor, seleccioná otro.");
        // Refrescar turnos ocupados y vista de horarios
        const turnosRaw = await API.obtenerTurnosOcupados();
        turnosOcupadosMap = mapearTurnosOcupados(turnosRaw);
        window.cargarHorariosDisponibles();
    } else {
        mostrarError("Hubo un error al reservar el turno: " + errorMsg);
    }

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i> Confirmar reserva';
    }
  }
};

// ── Resumen (paso 2 → paso 3) ──────────────────────────────
window.actualizarResumen = function () {
  const fecha  = document.getElementById("fecha")?.value;
  const horaEl = document.querySelector(".slot-horario.selected, .input-opcion.selected");
  const hora   = horaEl?.textContent?.trim() || "—";

  const resumenFecha = document.getElementById("resumen-fecha");
  const resumenHora  = document.getElementById("resumen-hora");
  const resumenServ  = document.getElementById("resumen-servicio");

  if (resumenFecha) resumenFecha.textContent = fecha || "—";
  if (resumenHora)  resumenHora.textContent  = hora;
  if (resumenServ)  resumenServ.textContent  = "Reserva General";

  const exitoFecha = document.getElementById("exito-fecha");
  const exitoHora  = document.getElementById("exito-hora");
  const exitoServ  = document.getElementById("exito-servicio");
  if (exitoFecha) exitoFecha.textContent = fecha || "—";
  if (exitoHora)  exitoHora.textContent  = hora;
  if (exitoServ)  exitoServ.textContent  = "Reserva General";
};

// ── Init ───────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Cargar info de la barbería (horarios dinámicos)
  try {
    barberiaInfo = await API.obtenerInfoBarberia();
    // Si el backend no devuelve horaInicio/horaFin (campo nuevo), poner defaults
    if (!barberiaInfo.horaInicio)      barberiaInfo.horaInicio      = "09:00";
    if (!barberiaInfo.horaFin)         barberiaInfo.horaFin         = "18:00";
    if (!barberiaInfo.intervaloMinutos) barberiaInfo.intervaloMinutos = 30;
  } catch (e) {
    console.error("Error al cargar info de barbería:", e);
    barberiaInfo = { id: null, horaInicio: "09:00", horaFin: "18:00", intervaloMinutos: 30 };
  }

  // Cargar turnos ocupados
  const turnosRaw   = await API.obtenerTurnosOcupados();
  turnosOcupadosMap = mapearTurnosOcupados(turnosRaw);

  // Set min date
  const dateInput = document.getElementById("fecha");
  if (dateInput && !dateInput.min) {
    dateInput.min = new Date().toISOString().split("T")[0];
  }
});
