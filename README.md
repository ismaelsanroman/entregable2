# 🚀 Entregable 2 — Arquitectura, eficiencia e integración (Playwright + TypeScript)

> Este README explica **cómo usar el proyecto de extremo a extremo**: instalación, 
> configuración por entornos, ejecución local, Docker / Docker Compose, 
> reportes (Allure), ejecución por navegadores y paralelización. 
> aquí verás **comandos y procedimientos** listos para ejecutar.

---
## 🗂️ Estructura del repositorio

```
.
├─ .auth/ # 🔐 storageState.json generado en globalSetup (NO versionar)
├─ .github/
│ └─ workflows/
│ └─ ci.yml         # 🤖 CI con matriz (chromium/firefox/webkit) y artefactos de reportes
├─ allure-report/   # 📊 Reporte servido por allure serve (artefacto local)
├─ allure-results/  # 🧪 Resultados Allure (si ejecutas allure fuera del runner)
├─ config/
│ ├─ env.ts         # 🌍 Carga de variables (.env/.env.staging/.env.prod) → ENV.BASE_URL, ENV.HEADLESS, etc.
│ └─ schemas/
│ └─ auth.ts        # ✅ Esquema/validador Zod (AuthResponseSchema + parseAuthResponse)
├─ reports/
│ ├─ allure-results/ # 🧾 Resultados Allure del runner Playwright (para allure serve)
│ └─ html/          # 📑 Reporte HTML de Playwright (abrir con npx playwright show-report)
├─ src/
│ ├─ pages/         # 🧩 Page Objects (POM)
│ └─ support/
│ └─ globalSetup.ts # 🧰 Testcontainers + WireMock + Zod; login UI (SauceDemo) o cookie/localStorage → .auth/storageState.json
├─ tests/
│ ├─ smoke/
│ │ └─ auth-state.spec.ts # 🔎 Smoke robusto: SauceDemo → /inventory.html; AUT real → valida cookie auth_token
│ └─ inventory.spec.ts # 🛒 E2E de inventario reutilizando sesión global
├─ test-results/    # 🎥 Traces / videos / screenshots por ejecución
├─ .dockerignore    # 🧹 Ignora artefactos al construir la imagen
├─ .env             # 🔧 Variables locales por defecto
├─ .gitattributes
├─ .gitignore       # 🚫 Ignora .auth/, reports/, test-results/, allure-*, etc.
├─ compose.yaml     # 🐳 (Opcional) Servicios auxiliares si decides usar Docker Compose
├─ Dockerfile       # 📦 Imagen reproducible (Playwright + navegadores + Node)
├─ package.json     # 🧵 Scripts NPM (tests, mock:up/down si aplican)
├─ package-lock.json
├─ playwright.config.ts # 🏗️ Config central: reporters, projects, use.storageState, globalSetup
├─ tsconfig.json    # ⚙️ Opciones del compilador TypeScript
└─ README.md        # 📘 Esta guía (instalación, extras, Docker/CI, troubleshooting)


> **Nota**  
> - Carpetas **no versionables**: `.auth/`, `test-results/`, `reports/`, `allure-results/`, `allure-report/`.  
> - El `globalSetup.ts` arranca **WireMock** con **Testcontainers**, valida `/auth/login` con **Zod** y genera `storageState`.  
> - Si `BASE_URL` es SauceDemo, hace **login UI real** y guarda el estado; si apuntas a tu AUT real, puedes usar **cookie** o **localStorage**.
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
## 🧭 Resumen rápido

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

### Variables mínimas
| Variable       | Ejemplo                       | Descripción                                          |
|----------------|--------------------------------|------------------------------------------------------|
| `BASE_URL`     | `https://www.saucedemo.com`    | URL base de la aplicación bajo prueba                |
| `HEADLESS`     | `true`                         | Ejecutar navegador en modo headless                  |
| `SAUCE_USER`   | `standard_user`               | (Solo SauceDemo) usuario para login UI               |
| `SAUCE_PASS`   | `secret_sauce`                | (Solo SauceDemo) password para login UI              |

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
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### UI/Debug
```bash
npx playwright test --ui
npx playwright test --headed

# Linux/macOS
PWDEBUG=1 npx playwright test
# Windows PowerShell
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
npx playwright test --workers=4
```

### Reporte HTML
```bash
npx playwright show-report reports/html
```

### Allure (viewer local)
```bash
# Servir el reporte a partir de resultados
npx allure serve reports/allure-results

# (Alternativa) Generar estático y abrir
npx allure generate reports/allure-results --clean
npx allure open
```
---

## 🐳 Docker (build/run directo)

### Build
```bash
docker build -t entregable2-e2e .
```

### Run (Windows PowerShell + Docker Desktop)
```bash
docker run --rm -t `
  -u root `
  --privileged `
  -e BASE_URL="https://www.saucedemo.com" `
  -e SAUCE_USER="standard_user" `
  -e SAUCE_PASS="secret_sauce" `
  -e DOCKER_HOST="unix:///var/run/docker.sock" `
  -e TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="/var/run/docker.sock" `
  -e TESTCONTAINERS_HOST_OVERRIDE="host.docker.internal" `
  -v "/var/run/docker.sock:/var/run/docker.sock" `
  -v "${PWD}:/work" -w /work `
  entregable2 npx playwright test --project=chromium
```

### Run (Linux)
```bash
docker run --rm -t \
  -u root \
  --privileged \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL="https://www.saucedemo.com" \
  -e SAUCE_USER="standard_user" \
  -e SAUCE_PASS="secret_sauce" \
  -e DOCKER_HOST=unix:///var/run/docker.sock \
  -e TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD":/work -w /work \
  entregable2 npx playwright test --project=chromium
```
Claves para que Testcontainers funcione **dentro** de Docker:

- Montar el **socket**: `v /var/run/docker.sock:/var/run/docker.sock`
- Definir `TESTCONTAINERS_*` y `DOCKER_HOST`
- `-privileged` (o afinar permisos del grupo del socket)
- En Linux, `-add-host=host.docker.internal:host-gateway

## 🧩 Docker Compose — flujo recomendado (4 pasos)

Si tu `compose.yaml` define servicios (p.ej. `tests`), podrías hacer:

```bash
Mostrar siempre los detalles
docker compose build --no-cache
docker compose run --rm tests
docker compose down -v --remove-orphans

```

> Ajusta los nombres de servicios a tu compose.yaml. La guía oficial de este repo usa el modo directo (sección anterior), que ya está verificado.

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
## 🤖 CI (GitHub Actions) — matriz 3 navegadores

Ejemplo de `ci.yml` minimalista:

```yaml
Mostrar siempre los detalles
name: CI
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix: { project: [chromium, firefox, webkit] }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - name: Run tests
        env:
          BASE_URL: https://www.saucedemo.com
          SAUCE_USER: standard_user
          SAUCE_PASS: secret_sauce
        run: npx playwright test --project=${{ matrix.project }}
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: html-report-${{ matrix.project }}, path: reports/html }
      - if: always()
        uses: actions/upload-artifact@v4
        with: { name: allure-results-${{ matrix.project }}, path: reports/allure-results }

```
---
## 🧯 Troubleshooting rápido

- **No se genera `.auth/`** → revisa credenciales/URL/esperas; verifica permisos de la carpeta en host y mapeo de volúmenes.
- **Diferencias local vs contenedor** → alinea variables, locale/timezone y **limpia cache** con `docker compose build --no-cache`.
- **EACCES en Windows** → añade `user: "0:0"` al servicio de tests y/o revisa permisos de los volúmenes en NTFS.
- **Reportes vacíos** → confirma rutas de salida (`reports/allure-results`, `reports/html`, `test-results`) y que tu pipeline publique artefactos.
- **Flakiness** → considera `--workers` más bajo temporalmente y revisa selectores/esperas/fixtures.

---
## 🧩 **Extras** (cumplidos)
**Mock de autenticación** con **Testcontainers + WireMock** y **validación de contrato** con **Zod**:

- `src/support/globalSetup.ts` levanta **WireMock** efímero (Testcontainers), siembra `POST /auth/login`, **valida** la respuesta con `Zod` (`config/schemas/auth.ts`) y genera `.auth/storageState.json`.
- Si `BASE_URL` contiene `saucedemo.com`, el `globalSetup` hace **login UI real** (standard_user/secret_sauce por defecto) y guarda el estado.  
  Si no, inyecta **cookie/token** o (alternativa comentada) **localStorage** para tu AUT.
- `playwright.config.ts` usa ese estado global (`storageState`) en todos los proyectos.
- **CI** ejecuta la **matriz** de navegadores (`chromium`, `firefox`, `webkit`).

> Ventajas: **login único**, **paralelización segura**, **ambiente reproducible** y **contratos validados** en tiempo de ejecución.

---
## 💊 Verrificar que todo funciona y no hemos "roto" nada

### 🩺 Sanity check (versiones / diagnóstico)

```bash
# Común
node -v
npm -v
npx playwright --version
npx playwright doctor
docker version
```

---

### 🔧 Instalación y navegadores

```bash
npm ci
npx playwright install --with-deps
```

---

### 🧼 Reset rápido + regenerar sesión (globalSetup)

**Windows (PowerShell)**

```powershell
Remove-Item -Recurse -Force .auth, reports -ErrorAction SilentlyContinue
npx playwright test --project=chromium
```

**bash**

```bash
rm -rf .auth reports
npx playwright test --project=chromium
```

---

### 🚦 Smoke mínimo (sesión OK)

```bash
# Por tag (si usas @smoke)
npx playwright test -g "@smoke" --project=chromium

# Archivo de smoke
npx playwright test tests/smoke/auth-state.spec.ts --project=chromium
```

---

### 🌐 Suite completa / cross-browser

```bash
# Todos los navegadores de la matriz
npx playwright test

# Individual
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

### 🐳 Ejecutar dentro de Docker (con Testcontainers)

**Windows (PowerShell)**

```powershell
docker run --rm -t `
  -u root `
  --privileged `
  -e BASE_URL="https://www.saucedemo.com" `
  -e SAUCE_USER="standard_user" `
  -e SAUCE_PASS="secret_sauce" `
  -e DOCKER_HOST="unix:///var/run/docker.sock" `
  -e TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE="/var/run/docker.sock" `
  -e TESTCONTAINERS_HOST_OVERRIDE="host.docker.internal" `
  -v "/var/run/docker.sock:/var/run/docker.sock" `
  -v "${PWD}:/work" -w /work `
  entregable2 npx playwright test --project=chromium
```

**Linux (bash)**

```bash
docker run --rm -t \
  -u root --privileged \
  --add-host=host.docker.internal:host-gateway \
  -e BASE_URL="https://www.saucedemo.com" \
  -e SAUCE_USER="standard_user" \
  -e SAUCE_PASS="secret_sauce" \
  -e DOCKER_HOST=unix:///var/run/docker.sock \
  -e TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE=/var/run/docker.sock \
  -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "$PWD":/work -w /work \
  entregable2 npx playwright test --project=chromium
```

---

### 🐋 Testcontainers verbose (debug de mock)

**Windows (PowerShell):**

```powershell
$env:DEBUG="testcontainers*"
npx playwright test --project=chromium
```

**bash:**

```bash
DEBUG=testcontainers* npx playwright test --project=chromium
```

---

### 🧭 Verificación de `storageState` generado

**Windows (PowerShell)**

```powershell
Test-Path .auth\storageState.json
Get-Content .auth\storageState.json | Select-Object -First 5
```

**bash**

```bash
test -f .auth/storageState.json && head -n 5 .auth/storageState.json
```

---

### 🧪 UI / Debug puntual

```bash
npx playwright test --ui
npx playwright test --project=chromium --headed
PWDEBUG=1 npx playwright test   # (PowerShell: set PWDEBUG=1; npx playwright test)
```

---

### 📑 Reportes

```bash
# HTML
npx playwright show-report reports/html

# Allure (si tienes allure-cli)
allure serve reports/allure-results
# o
npx allure serve reports/allure-results
```

---

### 🔠 Calidad (opcional pero recomendado)

```bash
# Type-check (sin emitir)
npx tsc -p tsconfig.json --noEmit

# Lint (si tienes ESLint configurado)
npx eslint . --ext .ts
```

---

### 🧷 Comprobación específica SauceDemo (si algo duda)

```bash
# Ir directo a la ruta protegida (desde un test temporal)
npx playwright test tests/smoke/auth-state.spec.ts --project=chromium -g "inventory"
```

> Con esta batería: instalas, regeneras sesión, pasas smoke, ejecutas matriz, inspeccionas reportes, y si algo falla, activas DEBUG de Testcontainers.
>

---
## 👤 Créditos

Ismael Sanromán – SDET / QE (Sngular)
