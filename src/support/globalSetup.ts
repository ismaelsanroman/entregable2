/**
 * 🚪 Global Setup (Playwright)
 *
 * Propósito:
 * - Generar un `storageState` reutilizable para TODA la suite antes de ejecutar los tests.
 * - Soportar dos modos de autenticación:
 *   1) REAL: login UI contra la aplicación real (ENV.AUTH_MODE !== "mock").
 *   2) MOCK: levantar WireMock vía Testcontainers, publicar el endpoint `/auth/login`,
 *      validar el contrato con Zod y ejecutar un login UI semilla (o híbrido) que
 *      garantice un flujo estable y determinista.
 *
 * Flujo general:
 * - Asegura la carpeta `.auth/` (persistencia del estado).
 * - Si `ENV.AUTH_MODE === "mock"`:
 *    - Arranca contenedor de WireMock (puerto 8080).
 *    - Espera a que WireMock responda (`/__admin/mappings`) → evita condiciones de carrera.
 *    - Publica mapping `POST /auth/login` con respuesta controlada (token y usuario).
 *    - Valida la respuesta mock con `AuthResponseSchema` (Zod) para asegurar contrato.
 *    - Lanza Chromium headless, inyecta el token en `localStorage` (semilla)
 *      y ejecuta el login UI (doble garantía, ver nota más abajo).
 *    - Verifica acceso a `inventory.html` y elementos clave visibles.
 *    - Guarda `storageState` en `.auth/storageState.json`.
 *    - Para el contenedor de WireMock (siempre en `finally`).
 * - Caso REAL (por defecto):
 *    - Lanza Chromium headless, hace login UI real con `AUTH_USER`/`AUTH_PASSWORD`,
 *      verifica acceso a inventario y persiste `storageState`.
 *
 * Notas importantes:
 * - Si tu `AuthResponseSchema` espera `expiresAt` (string ISO) y aquí se envía `expiresIn`
 *   (number), alinea o ajusta el esquema o el mapping del mock para evitar falsos fallos
 *   de contrato.
 * - La semilla de `localStorage` + login UI es intencional: refuerza la sesión en apps que
 *   requieren cookies de sesión además del token. Si tu app acepta **solo token**, puedes
 *   omitir el login UI en modo mock y navegar directamente a área interna tras setear token.
 *
 * Artefactos:
 * - Estado persistido: `.auth/storageState.json`
 *
 * Logs:
 * - `log.step(...)` y `log.ok(...)` trazan acciones clave (visibles en Allure/HTML).
 */

import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { ENV } from "../../config/env";
import { log } from "./logger";
import { AuthResponseSchema } from "../../config/schemas/auth";

import { GenericContainer, type StartedTestContainer } from "testcontainers";

// 📌 Ruta estándar donde guardaremos el estado de sesión
const STORAGE_PATH = ".auth/storageState.json";

/**
 * ⏳ Espera activa a que WireMock esté listo respondiendo a /__admin/mappings.
 * Evita carreras en las que el contenedor aún no aceptaba peticiones.
 */
async function waitForWireMock(base: string, attempts = 12, delayMs = 500) {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(`${base}/__admin/mappings`);
            if (res.ok) return;
        } catch {
            // Ignorar y reintentar — el contenedor puede no estar listo aún
        }
        await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`WireMock no respondió en ${attempts * delayMs} ms (${base})`);
}

export default async function globalSetup(config: FullConfig) {
    // 🗂️ Garantiza que existe la carpeta de persistencia de sesión
    mkdirSync(".auth", { recursive: true });

    // 🧪 MODO MOCK — Testcontainers + WireMock + Zod
    if (ENV.AUTH_MODE === "mock") {
        log.step("Iniciando WireMock en contenedor (modo mock)…");

        let wiremock: StartedTestContainer | undefined;

        try {
            // 🐳 Arranca contenedor oficial de WireMock y expone 8080
            wiremock = await new GenericContainer("wiremock/wiremock:3.9.1")
                .withExposedPorts(8080)
                .start();

            // 🔌 Resuelve host:puerto mapeado por Testcontainers
            const port = wiremock.getMappedPort(8080);
            const host = wiremock.getHost();
            const base = `http://${host}:${port}`;

            // ⏳ Espera a que el admin de WireMock responda
            await waitForWireMock(base);

            // 🗺️ Publica el mapping de /auth/login con respuesta controlada y estable
            await fetch(`${base}/__admin/mappings`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    request: { method: "POST", urlPath: "/auth/login" },
                    response: {
                        status: 200,
                        headers: { "Content-Type": "application/json" },
                        jsonBody: {
                            token: "mocked-token-abcdef-1234567890",
                            user: {
                                id: 1,
                                username: ENV.AUTH_USER ?? "standard_user",
                                roles: ["user"],
                            },
                            // ⚠️ Si tu esquema espera `expiresAt` (ISO) en vez de `expiresIn` (number),
                            // ajusta el mapping o el esquema para mantener consistencia.
                            expiresIn: 3600,
                        },
                    },
                }),
            });

            // 🔐 Llama al mock de login y valida contrato con Zod
            log.step("Llamando a /auth/login (mock) y validando con Zod…");
            const res = await fetch(`${base}/auth/login`, { method: "POST" });
            const json = await res.json();
            const parsed = AuthResponseSchema.safeParse(json);
            if (!parsed.success) {
                throw new Error(
                    `Respuesta mock inválida: ${JSON.stringify(parsed.error.issues, null, 2)}`
                );
            }
            log.ok("Respuesta mock válida ✅");

            // 🧭 Abre navegador headless y prepara contexto limpio
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            // 🧪 Semilla de token en localStorage (útil si tu app lee token además de cookies de sesión)
            await page.addInitScript((token: string) => {
                localStorage.setItem("auth-token", token);
            }, (json as any).token);

            // 🔓 Login UI (híbrido): mantiene compatibilidad con apps que exigen cookies/sesión
            await page.goto(ENV.BASE_URL);
            await page.fill("#user-name", ENV.AUTH_USER);
            await page.fill("#password", ENV.AUTH_PASSWORD);
            await page.click("#login-button");

            // ✅ Garantiza que estamos dentro del inventario antes de persistir el estado
            await page.waitForURL("**/inventory.html");
            await page.locator(".inventory_item").first().waitFor({ state: "visible", timeout: 10_000 });

            // 💾 Persistencia de estado para toda la suite
            await context.storageState({ path: STORAGE_PATH });
            await browser.close();

            log.ok(`storageState generado en ${STORAGE_PATH} (modo mock)`);
            return;
        } finally {
            // 🧹 Limpieza del contenedor incluso si algo falla en el setup
            if (wiremock) {
                await wiremock.stop().catch(() => {});
            }
        }
    }

    // ✅ MODO REAL — login UI contra la app real
    log.step("Login UI en SauceDemo (modo real)…");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(ENV.BASE_URL);
    await page.fill("#user-name", ENV.AUTH_USER);
    await page.fill("#password", ENV.AUTH_PASSWORD);
    await page.click("#login-button");

    // 🧭 Verifica aterrizaje correcto en inventario
    await page.waitForURL("**/inventory.html");
    await page.locator(".inventory_item").first().waitFor({ state: "visible", timeout: 10_000 });

    // 💾 Guarda estado para el resto de tests
    await context.storageState({ path: STORAGE_PATH });
    await browser.close();
    log.ok(`storageState generado en ${STORAGE_PATH} (modo real)`);
}
