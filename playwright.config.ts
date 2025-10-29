/**
 * 🎯 Playwright Configuration
 *
 * Propósito del fichero:
 * - Centraliza la configuración de la suite E2E (timeouts, reportería, proyectos/navegadores).
 * - Reutiliza la sesión de usuario mediante `storageState` (generado en `globalSetup`).
 * - Define reporterías (Allure + HTML) y artefactos (traces, screenshots, videos).
 * - Habilita ejecución cross-browser (Chromium, Firefox, WebKit) con perfiles de dispositivos por defecto.
 *
 * Cómo se usa en la práctica:
 * - `npx playwright test` → ejecuta toda la suite con los ajustes por defecto.
 * - `npx playwright test --project=chromium|firefox|webkit` → ejecuta por navegador.
 * - `npx playwright test --ui` → modo UI para depuración y selección de tests.
 *
 * Entornos y variables:
 * - `ENV.BASE_URL` y `ENV.HEADLESS` provienen de `./config/env` (centraliza URL y flags por entorno).
 * - El estado de sesión se persiste en `.auth/storageState.json` (login único vía `globalSetup`).
 *
 * Artefactos relevantes:
 * - Allure results: `reports/allure-results` (consumido por Allure).
 * - HTML report: `reports/html` (revisión rápida sin Allure).
 * - Traces/Screenshots/Videos: controlados por `trace/screenshot/video` y recogidos en `test-results` (por defecto Playwright).
 */

import { defineConfig, devices } from "@playwright/test";
import { ENV } from "./config/env"; // 🌍 Capa de configuración por entorno (BASE_URL, HEADLESS, etc.)

export default defineConfig({
    // 📁 Carpeta raíz donde residen los tests
    testDir: "./tests",

    // ⏱️ Timeout máximo por test (incluye todo el flujo del caso)
    timeout: 30_000,

    // ⏱️ Timeout para aserciones de `expect(...)`
    expect: { timeout: 10_000 },

    // 🔁 Reintentos a nivel de test (útil para flakiness controlada o entornos inestables)
    retries: 1,

    // 🧾 Reporters: salida en consola, Allure (resultados) y HTML (visual)
    reporter: [
        ["line"], // Consola compacta (útil en local/CI para feedback rápido)
        ["allure-playwright", { outputFolder: "reports/allure-results" }], // Resultados para Allure
        ["html", { outputFolder: "reports/html", open: "never" }], // Reporte HTML (no se abre automáticamente)
    ],

    // ⚙️ Configuración por defecto aplicada a todos los tests (contexto/`page`)
    use: {
        baseURL: ENV.BASE_URL,                 // 🌐 URL base para `page.goto()` y rutas relativas
        storageState: ".auth/storageState.json", // 🔐 Sesión persistida (generada en `globalSetup`)
        trace: "on-first-retry",               // 🧵 Captura trace en el primer retry (diagnóstico de fallos intermitentes)
        screenshot: "only-on-failure",         // 📸 Screenshot solo si falla el test
        video: "retain-on-failure",            // 🎬 Video retenido en fallos para análisis
        headless: ENV.HEADLESS,                // 🖥️ Modo headless configurable por entorno
        navigationTimeout: 30_000,             // ⛵ Timeout específico para navegaciones
    },

    // 🌐 Proyectos por navegador para ejecución cross-browser
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox",  use: { ...devices["Desktop Firefox"] } },
        { name: "webkit",   use: { ...devices["Desktop Safari"] } },
    ],

    // 🚪 Hook global previo a la suite: login UI/API y guardado de `storageState`
    //   - Debe resolver con un `auth.json` válido en `.auth/storageState.json`.
    //   - Importante: si cambian credenciales o caduca la sesión, regenerar borrando `.auth/`.
    globalSetup: "./src/support/globalSetup.ts",
});
