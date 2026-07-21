import { ENDPOINTS } from "../js/config.js";

// Toggle password visibility
document.getElementById("togglePassword").addEventListener("click", function () {
  const password = document.getElementById("password");
  const type = password.getAttribute("type") === "password" ? "text" : "password";
  password.setAttribute("type", type);
  this.textContent = type === "password" ? "👁️" : "🙈";
});

// Form validation and submission
document.getElementById("loginForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const form = this;
  const submitBtn = form.querySelector('button[type="submit"]');
  const loginText = submitBtn.querySelector(".login-text");
  const spinner = submitBtn.querySelector(".spinner-border");

  // Validate form
  if (!form.checkValidity()) {
    e.stopPropagation();
    form.classList.add("was-validated");
    return;
  }

  // Show loading state
  submitBtn.disabled = true;
  loginText.classList.add("d-none");
  spinner.classList.remove("d-none");

  // Get form data
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    const payload = { email: email, contrasenia: password };

    const res = await fetch(ENDPOINTS.barberias + '/login', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorMsg = await res.text();
      throw new Error(errorMsg || "Error en la solicitud de inicio de sesión");
    }

    const data = await res.json();
    // Guardar sesión de la barbería
    sessionStorage.setItem('barberia_admin', JSON.stringify(data));
    
    // Success - redirect to dashboard
    window.location.href = "./panel-turnos.html";
  } catch (error) {
    // Error handling
    console.error("Error:", error);
    alert(error.message || "Error al iniciar sesión. Verifica tus credenciales.");
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    loginText.classList.remove("d-none");
    spinner.classList.add("d-none");
  }
});

// Clear validation on input
document.querySelectorAll(".form-control").forEach((input) => {
  input.addEventListener("input", function () {
    if (this.classList.contains("is-invalid")) {
      this.classList.remove("is-invalid");
    }
  });
});

// Auto-focus email field
document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("email").focus();
});
