# Barber System

Sistema de gestión de turnos para barberías. Arquitectura en dos partes:

- **Backend**: Spring Boot 3.4, Java 21, Maven, JPA, PostgreSQL / H2
- **Frontend**: HTML, CSS, JS vanilla (sin frameworks, sin build step), Bootstrap 5

---

## Requisitos previos

| Herramienta | Versión mínima |
|---|---|
| Java (JDK) | 21 |
| Maven | 3.9+ (o usar `./mvnw` incluido) |
| PostgreSQL | 15+ (solo para producción; en local usa H2) |
| Python | 3.x (para servir el frontend en local) |

---

## Levantar el proyecto localmente

### 1. Backend

```bash
cd barberBackend
./mvnw spring-boot:run
```

El backend quedará escuchando en `http://localhost:8080`.

**Base de datos local:** se usa H2 (archivo persistente) por defecto.  
Los datos se guardan en `barberBackend/data/barberdb.mv.db`.

**Consola H2** (solo en local): `http://localhost:8080/h2-console`  
- JDBC URL: `jdbc:h2:file:./data/barberdb;AUTO_SERVER=TRUE`
- Usuario: `sa` / Contraseña: `password`

### 2. Frontend

```bash
cd frontend
python -m http.server 3000
```

Abrí el navegador en `http://localhost:3000`.

> **Importante:** El frontend **debe** servirse en el puerto 3000 para que el backend acepte
> las peticiones (CORS solo permite `localhost:3000` y `127.0.0.1:3000` por defecto).

---

## Variables de entorno

### Requeridas solo en producción (`SPRING_PROFILES_ACTIVE=prod`)

| Variable | Propósito | Ejemplo |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Activa el perfil de producción | `prod` |
| `SPRING_DATASOURCE_URL` | URL JDBC de la base de datos PostgreSQL | `jdbc:postgresql://host/db?sslmode=require` |
| `SPRING_DATASOURCE_USERNAME` | Usuario de la base de datos | `postgres` |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña de la base de datos | `secreto` |
| `JWT_SECRET` | Clave para firmar tokens JWT (mínimo 32 caracteres) | `claveSegura32chars...` |
| `SUPERADMIN_EMAIL` | Email del superadministrador del sistema | `admin@miempresa.com` |
| `SUPERADMIN_PASSWORD` | Contraseña del superadmin (se hashea con BCrypt al primer login) | `miContraseñaSegura` |
| `ALLOWED_ORIGINS` | Orígenes CORS permitidos, separados por coma | `https://usuario.github.io` |

### Opcionales (con defaults razonables)

| Variable | Default | Propósito |
|---|---|---|
| `JWT_EXPIRATION_MS` | `86400000` (24 h) | Duración del token JWT en milisegundos |
| `MAIL_USERNAME` | vacío | Cuenta Gmail para enviar notificaciones |
| `MAIL_PASSWORD` | vacío | Contraseña de aplicación de Gmail |
| `MAIL_SIMULATION_MODE` | `true` (local) / `false` (prod) | Si `true`, loguea el email en vez de enviarlo |
| `PORT` | `8080` | Puerto HTTP (Render lo asigna automáticamente) |

---

## Ejecutar los tests

```bash
cd barberBackend
./mvnw test
```

Los tests usan H2 en memoria (perfil `test`) — no necesitan PostgreSQL ni conexión a internet.

---

## Deployment

| Componente | Plataforma | Rama |
|---|---|---|
| Backend | [Render](https://render.com) (plan Free) | `backend` |
| Frontend | [GitHub Pages](https://pages.github.com) | `frontend` |
| Base de datos | [Neon](https://neon.tech) (PostgreSQL Serverless, plan Free) | — |

### Backend en Render

1. Crear un **Web Service** apuntando a la rama `backend`, Root Directory: `barberBackend`.
2. Runtime: **Docker** (detecta el `Dockerfile` automáticamente).
3. Agregar las variables de entorno listadas arriba en la sección "Requeridas".
4. Render asigna el puerto via `$PORT` — ya está configurado automáticamente.

> ⚠️ El plan Free de Render hiberna el servicio tras 15 min de inactividad.
> La primera petición después de un período inactivo puede tardar hasta 50 segundos.

### Frontend en GitHub Pages

1. Ir a **Settings → Pages** en el repositorio.
2. Seleccionar la rama `frontend` y carpeta `/ (root)`.
3. GitHub Pages sirve el `index.html` en `https://<usuario>.github.io/<repo>`.

---

## Estructura del proyecto

```
Barberia-main/
├── barberBackend/          # Spring Boot 3.4
│   ├── src/main/java/...   # Código fuente Java
│   ├── src/main/resources/ # application.properties, application-prod.properties
│   ├── src/test/           # Tests de integración
│   ├── Dockerfile
│   └── pom.xml
├── frontend/               # HTML/CSS/JS vanilla
│   ├── index.html          # Página de reservas (cliente)
│   ├── admin/              # Panel de administración
│   ├── js/config.js        # API_BASE_URL y helpers de auth
│   └── css/styles.css
└── AGENTS.md               # Guía para agentes de IA
```
