# 🚀 Entregable 2 — Arquitectura, eficiencia e integración (Playwright + TypeScript)

> Este README explica **cómo usar el proyecto de extremo a extremo**: instalación, configuración por entornos, ejecución local, Docker / Docker Compose, reportería (Allure), ejecución por navegadores y paralelización. **No se incluyen fragmentos de código del repositorio** (Dockerfile, globalSetup, etc.); aquí verás **comandos y procedimientos** listos para ejecutar.

---
## 🗂️ Estructura del repositorio

```
.
├─ .auth/                           # Estado de sesión persistido (storageState.json)
├─ .github/workflows/ci.yml         # Pipeline CI con matriz de navegadores
├─ config/
│  ├─ env.ts                        # Carga .env/.env.staging/.env.prod → ENV
│  └─ schemas/
│     └─ auth.ts                    # Esquema Zod de respuesta /auth/login
├─ reports/
│  ├─ allure-results/               # Resultados raw Allure
│  └─ html/                         # Reporte HTML de Playwright (artefacto local)
├─ src/
│  ├─ pages/                        # (POM) páginas – base para siguiente entregable
│  └─ support/
│     ├─ globalSetup.ts             # Login real o mock (WireMock + Zod) → storageState.json
│     └─ logger.ts                  # Logger con emojis y niveles
├─ tests/
│  └─ inventory.spec.ts             # Test de inventario reutilizando sesión
├─ test-results/                    # Trazas/videos/screenshots por ejecución
├─ .env                             # Variables de entorno por defecto (local)
├─ Dockerfile                       # Imagen de ejecución Playwright + Node
├─ package.json                     # Scripts de NPM
├─ playwright.config.ts             # Config central de Playwright
├─ tsconfig.json                    # TS compiler options
└─ README.md                        # (este documento)

```

**Qué hace cada pieza**

- **`config/env.ts`**: decide qué `.env` cargar según `NODE_ENV` y expone `ENV` (BASE_URL, HEADLESS, AUTH_* y AUTH_MODE).
- **`config/schemas/auth.ts`**: define `AuthResponseSchema` con **Zod** para validar el JSON del mock.
- **`src/support/globalSetup.ts`**:
    - **REAL**: login UI en SauceDemo y persiste `storageState.json` en `.auth/`.
    - **MOCK**: levanta **WireMock en Docker** (Testcontainers), configura `/auth/login`, valida con **Zod** y **hace login UI** para generar `storageState`. Robusto multi‑navegador.
- **`logger.ts`**: util de trazas con iconos (`step`, `ok`, `warn`, `error`).
- **`playwright.config.ts`**: directorio de tests, `use` por defecto (baseURL, storageState…), reporter **Allure/HTML**, `expect.timeout`, `navigationTimeout`, `globalSetup`, proyectos por navegador.
- **`Dockerfile`**: imagen reproducible (Node + Playwright Browsers) que ejecuta la suite y saca reportes.
- **`ci.yml`**: job con **strategy.matrix** para `chromium`, `firefox` y `webkit`, cache de npm, publicación de **Allure results** como artefacto.

---
## 🧭 Resumen rápido (para impacientes)

- **Instalar** deps + navegadores → `npm ci` → `npx playwright install --with-deps`
- **Configurar** variables (URL, usuario/clave, flags) → `.env` o variables de entorno
- **Generar sesión** (login único) → primera ejecución crea el `storageState` (carpeta estandarizada `.auth/`)
- **Ejecutar** E2E → `npx playwright test` (o por proyecto con `--project=chromium|firefox|webkit`)
- **Ver reportes** → `npx allure serve reports/allure-results`
- **Docker** → `docker build -t entregable2-e2e .` → `docker run ...`
- **Docker Compose (recomendado)** → flujo 4 pasos (limpiar → compilar → real → mock)

> Si usas scripts npm, sustituye los `npx` por `npm run <script>` según tu `package.json`.

---

## 🧰 Prerrequisitos

- **Node.js LTS** (18.x o 20.x)
- **npm** (o `pnpm`/`yarn`, si tu proyecto lo usa)
- **Docker** y **Docker Compose**
- **Allure CLI** para abrir reportes (ver sección de reportería)

---

## ⚙️ Configuración por entornos

### Variables mínimas recomendadas
| Variable   | Ejemplo                       | Descripción                                     |
|-----------|--------------------------------|-------------------------------------------------|
| `BASE_URL`| `https://app.example.com`      | URL base de la aplicación bajo prueba           |
| `USER`    | `demo@example.com`             | Usuario de pruebas (si aplica)                  |
| `PASS`    | `supersecret`                  | Contraseña de pruebas (si aplica)               |
| `HEADLESS`| `true`                         | Ejecutar navegador en modo headless             |

**Gestión habitual**: archivo `.env` local (no versionado) o variables exportadas; en CI usar **secrets**.

---

## 🛠️ Instalación (primera vez)

```bash
# Instalar dependencias
npm ci            # (o: npm install)

# Instalar navegadores y dependencias del sistema para Playwright
npx playwright install --with-deps
```

> Si tu proyecto usa `pnpm` o `yarn`, sustituye en consecuencia.

---

## 🔐 Sesión compartida (login único)

- La **primera ejecución** dispara el `globalSetup`, hace **login** y **persiste** un archivo de sesión.
- La carpeta estándar para la sesión en este proyecto es **`.auth/`** (ajústala si tu repo usa otra).

**Forzar regeneración**: elimina `.auth/` (o el archivo de estado que use el repo) y vuelve a ejecutar.

---

## 🧪 Ejecución local de pruebas

### Comando base
```bash
npx playwright test
```

### UI/Debug
```bash
npx playwright test --ui
npx playwright test --headed

# Pausas interactivas (Linux/macOS)
PWDEBUG=1 npx playwright test
# (Windows PowerShell)
set PWDEBUG=1; npx playwright test
```

### Selección por navegador
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Filtrado
```bash
# Por título/patrón
npx playwright test -g "@smoke"

# Por ruta
npx playwright test tests/checkout/
```

### Paralelización
```bash
npx playwright test --workers=4
```

---

## 📊 Reportería (Allure y artefactos)

- Artefactos estándar:

    - **Allure results** → `reports/allure-results`
    - **HTML report**   → `reports/html` (si está configurado así en tu repo)
    - **Traces / Videos / Screenshots** → dentro de `test-results` o rutas configuradas

- Ver Allure localmente:
```bash
# Servir el reporte a partir de los resultados
npx allure serve reports/allure-results

# (Alternativa) Generar estático y abrir
npx allure generate reports/allure-results --clean
npx allure open
```

> En CI, publica `reports/allure-results` como artefacto o genera el sitio de Allure si tu pipeline lo soporta.

---

## 🐳 Docker (build/run directo)

### Build
```bash
docker build -t entregable2-e2e .
```

## 🧩 Docker Compose — flujo recomendado (4 pasos)

> Requiere que tu `compose.yaml` defina los servicios `real` y `mock` (o equivalentes). Reemplaza los nombres si tu archivo usa otros.

### 🧹 Paso 1 — Limpiar el estado anterior
```bash
docker compose down -v --remove-orphans
```
**Por qué**: cierra y elimina cualquier contenedor, red y volumen de ejecuciones previas. Evita interferencias (redes huérfanas, artefactos antiguos) que provocan fallos “raros”.

---

### 🏗️ Paso 2 — Construir la imagen desde cero
```bash
docker compose build --no-cache
```
**Por qué**: fuerza una **compilación limpia** (sin capas cacheadas) para garantizar consistencia.
- Alinea la base con tu imagen de Playwright, por ejemplo: `mcr.microsoft.com/playwright:v1.56.1-jammy` (si tu repo está fijado a `@playwright/test@1.56.1`).
- Asegura que queden creadas las rutas de artefactos dentro del contenedor, p. ej.:
    - `/home/pwuser/app/reports`
    - `/home/pwuser/app/.auth`
    - `/home/pwuser/app/test-results`

> **Nota**: si tu WORKDIR o rutas internas son distintas, ajusta los **volúmenes** y variables correspondientes en tu `compose.yaml`.

---

### ▶️ Paso 3 — Ejecutar tests en modo **REAL**
```bash
docker compose run --rm real
```
**Qué hace y por qué pasa**:
- Lanza el servicio **real** que ejecuta la suite contra la **web real** (`AUTH_MODE=real`, según tu configuración).
- El login UI genera `.auth/storageState.json` y se **persiste en el host** vía volúmenes.
- Corre la **matriz de navegadores** (Chromium/Firefox/WebKit) y deja:
    - **HTML report** en `reports/html` (si está configurado así).
    - **Allure results** en `reports/allure-results`.

**Windows / NTFS**: si ves errores **EACCES** al escribir, puedes añadir en el servicio de tests:  
`user: "0:0"` para ejecutar como root dentro del contenedor y sortear permisos de volumen.

---

### 🧪 Paso 4 — Ejecutar tests en modo **MOCK** (con Testcontainers)
```bash
docker compose run --rm mock
```
**Qué hace y por qué pasa**:
- Lanza **mock**, que usa **Testcontainers** para crear un contenedor **WireMock** desde *dentro* del contenedor de tests.
- Publica el mapping `POST /auth/login` y **valida el contrato** con **Zod** (respuesta consistente, sin flakiness).
- Vuelve a generar `storageState` y ejecuta la **misma matriz** pero en **entorno aislado** (mock).
- Artefactos de reportes y traces se guardan en los **mismos volúmenes** del host.

---

## 🔍 Validaciones recomendadas

- **Primera ejecución**: confirmar que `.auth/` contiene el estado y que los casos protegidos **no** repiten login.
- **Cross-browser**: comprobar los 3 motores (Chromium/Firefox/WebKit).
- **Paralelización**: ajustar `--workers` según capacidad, vigilando estabilidad.
- **Docker/Docker Compose**: comparar resultados con local y confirmar que `reports/`, `.auth/` y `test-results/` se rellenan correctamente.
- **Allure**: comprobar que los adjuntos (screenshots, videos, traces) están disponibles en fallos y en casos críticos.

---

## 🧯 Troubleshooting rápido

- **No se genera `.auth/`** → revisa credenciales/URL/esperas; verifica permisos de la carpeta en host y mapeo de volúmenes.
- **Diferencias local vs contenedor** → alinea variables, locale/timezone y **limpia cache** con `docker compose build --no-cache`.
- **EACCES en Windows** → añade `user: "0:0"` al servicio de tests y/o revisa permisos de los volúmenes en NTFS.
- **Reportes vacíos** → confirma rutas de salida (`reports/allure-results`, `reports/html`, `test-results`) y que tu pipeline publique artefactos.
- **Flakiness** → considera `--workers` más bajo temporalmente y revisa selectores/esperas/fixtures.

---

## 🗺️ Próximos pasos (opcional)

- Migración progresiva a **Screenplay** (actors/abilities/tasks).
- Servicios efímeros adicionales (DB/API) con **Testcontainers**.
- Publicación automática de Allure como artefacto o site en CI.
- Métricas de **tiempo por test** y **flakiness** para priorizar mejoras.

---

## 👤 Créditos

Equipo QA/SDET — Ismael Sanromán – SDET / QE (Sngular)
