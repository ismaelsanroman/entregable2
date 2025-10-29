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

**PowerShell**

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

**PowerShell**

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

## 🐳 Docker

### Build de la imagen

**PowerShell**

```powershell
docker build -t e2-playwright .

```

**Bash**

```bash
docker build -t e2-playwright .

```

### Ejecutar en **REAL**

**PowerShell**

```powershell
docker run --rm `
  -e BASE_URL=https://www.saucedemo.com `
  -e AUTH_MODE=real `
  -e HEADLESS=true `
  -v "${PWD}\reports:/app/reports" `
  -v "${PWD}\.auth:/app/.auth" `
  e2-playwright

```

**Bash**

```bash
docker run --rm \
  -e BASE_URL=https://www.saucedemo.com \
  -e AUTH_MODE=real \
  -e HEADLESS=true \
  -v "$(pwd)/reports:/app/reports" \
  -v "$(pwd)/.auth:/app/.auth" \
  e2-playwright

```

### Ejecutar en **MOCK** (requiere Docker Desktop activo)

**PowerShell**

```powershell
docker run --rm `
  -e AUTH_MODE=mock `
  -v "${PWD}\.auth:/app/.auth" `
  e2-playwright

```

> La imagen usa los navegadores de Playwright preinstalados. Los reportes se vuelcan en ./reports del host.
>

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

---

## 🗺️ Roadmap (siguiente entregable)

- Screenplay + POM real (Tasks/Interactions/Questions).
- Test data builders / factories.
- Marcado de tests por criticidad y suite runner.
- Linting/format (ESLint + Prettier) y pre‑commit hooks.
- Mocks adicionales (catálogo, inventario) y **contract tests** con Zod.

---

## 🧾 Créditos y licencia

Repositorio didáctico para **Entregable 2**: Playwright + TS · Allure · Docker · Testcontainers/WireMock · Zod.

> Cualquier duda o mejora: abrir issue/PR. ¡Happy testing! 🚀
>