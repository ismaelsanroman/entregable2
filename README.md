# 

# 🧪 Entregable 2 – Arquitectura, eficiencia e integración

> Stack: Playwright Test (TS) · TypeScript · Allure · Docker · Testcontainers + WireMock · Zod · Dotenv
>

---

## 📌 Objetivo del entregable

Dejar listo un entorno **portable y reproducible** para E2E con:

- **Arquitectura** mínima ordenada (config, support, tests, reports).
- **Eficiencia**: `globalSetup` que hace login **una sola vez** y reutiliza **`storageState.json`**.
- **Integración**:
    - **Mock de autenticación** con **Testcontainers + WireMock** y **validación Zod**.
    - **Dockerfile** para ejecutar en contenedor de forma idéntica a CI.
    - **CI matrix** (Chromium/Firefox/WebKit) y reportes **Allure**.

> Resultado: una suite que corre en local, en Docker y en CI con el mismo comportamiento.
>

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

## ⚙️ Requisitos

- **Node** 20+ (en local trabajamos con **v22.14**)
- **Docker Desktop** (WSL2) para el modo **mock** con Testcontainers
- **Java** (para usar `allure` CLI localmente) – opcional si usas solo el reporter HTML

---

## 🔐 Variables de entorno

Soportamos **tres ficheros** (el que exista se carga automáticamente):

- `.env` (por defecto) · `.env.staging` · `.env.prod`

Claves usadas:

```
BASE_URL=https://www.saucedemo.com
HEADLESS=true
AUTH_USER=standard_user
AUTH_PASSWORD=secret_sauce
AUTH_MODE=real   # real | mock

```

> Cambia AUTH_MODE para alternar entre servicio real y mock WireMock.
>

---

## 📦 Instalación

```bash
npm install
npx playwright install --with-deps

```

> Windows PowerShell: funciona igual. Si reinstalas todo, borra node_modules/ y package-lock.json y repite.
>

---

## 🧰 Scripts NPM (qué hace cada uno)

```json
{
  "test": "npx playwright test",
  "test:headed": "npx playwright test --headed",
  "test:mock": "cross-env AUTH_MODE=mock npx playwright test",
  "test:mock:ps": "powershell -NoProfile -Command \"$env:AUTH_MODE='mock'; npx playwright test; Remove-Item Env:AUTH_MODE\"",
  "test:mock:win": "set AUTH_MODE=mock&& npx playwright test",
  "allure:generate": "allure generate ./reports/allure-results --clean -o ./reports/allure-report",
  "allure:open": "allure open ./reports/allure-report"
}

```

- **`test`**: ejecuta toda la suite con el **modo** que indique `AUTH_MODE` (por defecto, `real`).
- **`test:mock`**: fuerza **mock** (útil en Bash/macOS/Linux). En PowerShell usa `test:mock:ps`; en CMD, `test:mock:win`.
- **`allure:*`**: genera y abre el informe Allure desde `reports/allure-results`.

**Consejo**: siempre que cambies de **REAL** ↔ **MOCK**, limpia el estado previo:

```powershell
Remove-Item .auth\storageState.json -Force -ErrorAction Ignore

```

---

## 🧪 Ejecutar tests (local)

### Real (UI login + storageState)

**Windows**

```powershell
$env:AUTH_MODE='real'
npx playwright test
Remove-Item Env:AUTH_MODE -ErrorAction Ignore

```

**macOS/Linux**

```bash
AUTH_MODE=real npx playwright test

```

### Mock (Testcontainers + WireMock + Zod)

**Windows**

```powershell
Remove-Item .auth\storageState.json -Force -ErrorAction Ignore
$env:AUTH_MODE='mock'
npx playwright test
Remove-Item Env:AUTH_MODE -ErrorAction Ignore

```

**macOS/Linux**

```bash
rm -f .auth/storageState.json
AUTH_MODE=mock npx playwright test

```

### Ejecutar un test/proyecto concreto

```bash
npx playwright test --project=chromium -g "Inventario – sesión reutilizada"

```

---

## 📊 Reportes

- **HTML (Playwright)**: `reports/html` → `npx playwright show-report reports/html`
- **Allure**: genera desde `reports/allure-results`

```bash
npm run allure:generate
npm run allure:open

```

Adjuntos por defecto: **screenshots**, **videos** y **trace.zip** en fallos o reintentos.

---

## ▶️ Quick Start (local)

> Requisitos: Node 20+, npm 10+, Docker Desktop (para modo mock).
>

```bash
Mostrar siempre los detalles
# 1) Instalar dependencias
npm ci

# 2) Instalar navegadores de Playwright (si haces ejecución local)
npx playwright install --with-deps

```

### Ejecutar en **modo REAL** (3 navegadores)

```bash
Mostrar siempre los detalles
# PowerShell / Bash
$env:AUTH_MODE='real'        # en bash: export AUTH_MODE=real
npx playwright test

```

### Ejecutar en **modo MOCK** (3 navegadores)

```bash
Mostrar siempre los detalles
# PowerShell / Bash
$env:AUTH_MODE='mock'        # en bash: export AUTH_MODE=mock
npx playwright test

```

### Reportes

```bash
Mostrar siempre los detalles
# HTML
npx playwright show-report reports/html

# Allure (requiere Allure CLI instalado en tu host)
npm run allure:generate
npm run allure:open

```

---
## 🐳 Docker (Compose) — Paso a paso con explicación

> Requisitos previos (una sola vez):
>
> - Tener **Docker Desktop** activo (Windows con WSL2 → contexto `desktop-linux`).
> - Archivo **`compose.yaml`** en la raíz con los servicios `real` y `mock`.
> - Archivo **`.env`** en texto plano (UTF-8) sin here-strings de PowerShell, con:
    >
    >     ```
>     BASE_URL=https://www.saucedemo.com
>     HEADLESS=true
>     AUTH_USER=standard_user
>     AUTH_PASSWORD=secret_sauce
>     AUTH_MODE=real
>     
>     ```
>
> - Si ves el aviso `the attribute 'version' is obsolete` en Compose, **borra** la clave `version:` del `compose.yaml`.

---

### 🧹 Paso 1 — Limpiar el estado anterior

```bash
docker compose down -v --remove-orphans

```

**Por qué:**

- Cierra y elimina cualquier contenedor, red y **volumen** que haya dejado un run previo.
- Evita interferencias (p. ej., redes huérfanas, artefactos antiguos) que pueden provocar fallos “raros”.

---

### 🏗️ Paso 2 — Construir la imagen desde cero

```bash
docker compose build --no-cache

```

**Por qué:**

- Fuerza una compilación limpia (sin capas cacheadas) para garantizar que:
    - Se usa la base `mcr.microsoft.com/playwright:v1.56.1-jammy` alineada con `@playwright/test@1.56.1`.
    - Quedan creadas las rutas de artefactos dentro del contenedor:

      `/home/pwuser/app/reports`, `/home/pwuser/app/.auth`, `/home/pwuser/app/test-results`.


---

### ▶️ Paso 3 — Ejecutar tests en **modo REAL**

```bash
docker compose run --rm real   # debe pasar

```

**Qué hace y por qué pasa:**

- Lanza el servicio `real` que ejecuta la suite **contra la web real** (`AUTH_MODE=real`).
- El **login UI** genera `.auth/storageState.json` que se **persiste en el host** (volumen montado).
- Corre la **matriz de navegadores** (Chromium/Firefox/WebKit) y deja:
    - **HTML report** en `reports/html`.
    - **Allure results** en `reports/allure-results`.

> 💡 En Windows, si alguna vez ves errores EACCES al escribir en volúmenes NTFS, tu compose.yaml puede incluir user: "0:0" en el servicio para ejecutar como root dentro del contenedor.
>

---

### 🧪 Paso 4 — Ejecutar tests en **modo MOCK** (con Testcontainers)

```bash
docker compose run --rm mock   # ahora también debe pasar

```

**Qué hace y por qué pasa:**

- Lanza `mock`, que usa **Testcontainers** para crear un contenedor **WireMock** *desde dentro* del contenedor de tests.
- Publica el mapping `POST /auth/login` y valida el contrato con **Zod** (contrato consistente, sin flakiness).
- Vuelve a generar `storageState` y ejecuta la **misma matriz** pero en entorno **aislado** (mock).
- Artefactos de reportes y traces se guardan en los mismos volúmenes del host.

> ℹ️ Durante el run de mock, Testcontainers puede crear el contenedor Ryuk (limpieza). Es esperado.
>
>
> Puedes verlo con:
>
> `docker ps --format "{{.Image}} {{.Names}}" | findstr /i ryuk` (Windows)
>

---

### 🛠️ Troubleshooting rápido

- **`Failed to connect to Reaper` o `Could not find a working container runtime strategy` en `mock`:**

  Asegúrate de que tu `compose.yaml` para `mock` **monta `docker.sock`** y exporta `DOCKER_HOST=unix:///var/run/docker.sock`.

  (Esto permite a Testcontainers crear contenedores desde dentro.)

- **`.env` inválido (error “unexpected character”):**

  Crea `.env` como **texto plano** sin `@" ... "@` de PowerShell; cada línea `CLAVE=valor` sin comillas.


---

### ✅ Resultado esperado

- `real` → 3 tests **passed** con login UI real y reportes en `reports/…`.
- `mock` → 3 tests **passed**, WireMock levantado por Testcontainers y reportes/traces en `reports/…`.

> Para abrir el HTML report (desde tu host):
>
> - Windows: `npx playwright show-report reports\html`
> - Linux/Mac: `npx playwright show-report reports/html`
>
> Allure (si tienes Allure CLI):
>
> `npm run allure:generate` y `npm run allure:open`
>
---

## 🧪 Scripts NPM

| Script | Descripción |
| --- | --- |
| **`npm test`** | Ejecuta toda la suite (modo controlado por `AUTH_MODE`). |
| **`npm run test:real`** | Ejecuta en **real** (con `AUTH_MODE=real`). |
| **`npm run test:mock`** | Ejecuta en **mock** (con `AUTH_MODE=mock`). |
| **`npm run allure:generate`** | Genera reporte Allure en `reports/allure-report`. |
| **`npm run allure:open`** | Sirve el reporte Allure localmente. |

*(Si no ves estos scripts en `package.json`, añádelos o ejecuta los comandos equivalentes mostrados arriba.)*

---

## 🤖 CI/CD (GitHub Actions)

- **strategy.matrix**: corre en `chromium`, `firefox`, `webkit` en paralelo.
- Cachea `~/.npm` y respeta `package-lock.json`.
- Sube **`reports/allure-results`** y el **HTML report** como artefactos.
- Usa el mismo `Dockerfile` o ejecuta con `actions/setup-node` + `npx playwright install`.

> Los jobs respetan AUTH_MODE (por defecto REAL). Para MOCK en CI, define AUTH_MODE=mock en el job y habilita Docker en el runner.
>

---

## 🧱 Diseño y patrones

- **POM base** en `src/pages/` (preparado para evolucionar a Screenplay en el siguiente entregable).
- Separación **config / support / tests**.
- **SOLID** (SRP en utilidades, OCP en esquemas/validaciones).
- **Logs con emojis** desde `logger.ts` en cada paso clave (inicio, acción, validación, éxito/alerta/error).

Ejemplo de trazas en consola:

```
🔍 Login UI en SauceDemo (modo real)…
✅ storageState generado en .auth/storageState.json (modo real)
🔍 Abriendo inventario…
🔍 Añadiendo el primer producto al carrito…
✅ Producto añadido correctamente ✅

```

---

## 🧪 Estrategia de pruebas (guía)

- **Smoke**: disponibilidad de páginas clave y flujo de login.
- **Regresión**: catálogos, filtros, carrito, checkout.
- **Negativas**: credenciales inválidas, estados vacíos, timeouts controlados.
- **Técnicas**: particiones de equivalencia (usuarios/roles), valores límite (cantidad carrito), pairwise (navegador × rol × canal), tablas de decisión (estado de inventario), máquinas de estado (checkout), caminos lógicos.
- **Priorización**: etiquetar por criticidad (alto/medio/bajo) y por tipo (`@smoke`, `@regression`).

> En Playwright puedes filtrar por nombres o por anotaciones (test.info().annotations) y --grep.
>

---

## 🔧 Troubleshooting

### 1) `Cannot find module '@playwright/test'` / versiones mezcladas

- Asegúrate de que **existe** `node_modules` y `package-lock.json`.
- Ejecuta: `npm install` y `npx playwright install --with-deps`.

### 2) `cross-env no se reconoce`

- Instala devDeps: `npm install`.
- En PowerShell usa `npm run test:mock:ps`; en CMD, `npm run test:mock:win`.

### 3) `Could not find a working container runtime strategy`

- Docker Desktop **no está activo**. Abre Docker y verifica `docker version` (bloque **Server** debe aparecer).
- Comprueba el contexto: `docker context use desktop-linux`.

### 4) Tras cambiar REAL ↔ MOCK no se ve inventario

- Borra `./.auth/storageState.json` y vuelve a ejecutar.
- Asegúrate de tener el **parche robusto**: en MOCK el `globalSetup` hace **login UI** tras validar el mock.

### 5) Allure no abre

- Requiere **Java** en local. Alternativa: usa el reporte HTML de Playwright o abre Allure en CI como artefacto.

### 6) Limpieza de navegadores Playwright

```bash
npx playwright install --force

```