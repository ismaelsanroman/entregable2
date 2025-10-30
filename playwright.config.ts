/**
 * 🏗️ Playwright config (TypeScript)
 *
 * Objetivo:
 * - Centralizar configuración de tests E2E: timeouts, reporters, proyectos (navegadores)
 *   y opciones de contexto (storageState, trace, screenshots, video, etc.).
 * - Integrarse con la capa de entornos (`ENV`) y con el `globalSetup` que genera
 *   `.auth/storageState.json` (login único real/mock).
 *
 * Notas:
 * - `ENV` carga variables desde `.env/.env.staging/.env.prod` (ver `config/env.ts`).
 * - `globalSetup` levanta Testcontainers+WireMock, valida con Zod y:
 *     • SauceDemo → hace login UI real y guarda estado
 *     • AUT real  → inyecta cookie/localStorage con token del mock y guarda estado
 * - Este fichero **no** debe contener lógica de tests.
 */

import { defineConfig, devices } from "@playwright/test";
import { ENV } from "./config/env"; // 🌍 Capa de configuración por entorno (BASE_URL, HEADLESS, etc.)

export default defineConfig({
    /* ------------------------------------------------------------------------ */
    /* 📁 Directorio y timeouts                                                 */
    /* ------------------------------------------------------------------------ */

    // Carpeta raíz donde se encuentran los tests
    testDir: "./tests",

    // Timeout máximo por test (incluye todo el flujo del caso)
    timeout: 30_000,

    // Timeout por defecto para aserciones `expect(...)`
    expect: { timeout: 10_000 },

    // Reintentos a nivel de test: útil para flakiness controlada o entornos remotos/CI
    retries: 1,

    /* ------------------------------------------------------------------------ */
    /* 🧾 Reporters                                                             */
    /* ------------------------------------------------------------------------ */

    reporter: [
        // Consola compacta (útil en local/CI para feedback rápido)
        ["line"],

        // Resultados Allure (consumidos por `allure serve` o `allure generate`)
        ["allure-playwright", { outputFolder: "reports/allure-results" }],

        // Reporte HTML nativo de Playwright (se abre con `npx playwright show-report reports/html`)
        ["html", { outputFolder: "reports/html", open: "never" }],
    ],

    /* ------------------------------------------------------------------------ */
    /* ⚙️ Opciones por defecto aplicadas a todos los tests                      */
    /* ------------------------------------------------------------------------ */

    use: {
        // 🌐 URL base para `page.goto()` y rutas relativas
        baseURL: ENV.BASE_URL,

        // 🔐 Sesión persistida en disco (generada por `globalSetup`)
        storageState: ".auth/storageState.json",

        // 🧵 Captura trace sólo en el primer retry (útil para diagnosticar flakiness sin inundar artefactos)
        trace: "on-first-retry",

        // 📸 Screenshot sólo si falla el test (reduce ruido)
        screenshot: "only-on-failure",

        // 🎬 Guardar vídeo sólo en fallos (opción equilibrada para CI)
        video: "retain-on-failure",

        // 🖥️ Headless configurable desde ENV (mejor control por entorno)
        headless: ENV.HEADLESS,

        // ⛵ Timeout específico para navegaciones (aparte del `timeout` global)
        navigationTimeout: 30_000,
    },

    /* ------------------------------------------------------------------------ */
    /* 🌐 Proyectos por navegador (matriz cross-browser)                        */
    /* ------------------------------------------------------------------------ */

    projects: [
        // Desktop Chromium (Chrome estable)
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },

        // Desktop Firefox
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },

        // Desktop WebKit (Safari)
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
    ],

    /* ------------------------------------------------------------------------ */
    /* 🚪 Hook global previo a la suite                                         */
    /* ------------------------------------------------------------------------ */

    // Ejecuta **una vez** antes de toda la suite:
    // - Levanta WireMock (Testcontainers) + valida contrato (Zod)
    // - Realiza login (UI o token) y guarda `.auth/storageState.json`
    globalSetup: require.resolve("./src/support/globalSetup.ts"),
});
