import type { FullConfig } from "@playwright/test";
import { chromium } from "@playwright/test";
import { mkdirSync } from "fs";
import { ENV } from "../../config/env";
import { log } from "./logger";
import { AuthResponseSchema } from "../../config/schemas/auth";

// ✅ Testcontainers (Docker-friendly)
import { GenericContainer, type StartedTestContainer } from "testcontainers";

const STORAGE_PATH = ".auth/storageState.json";

/**
 * Espera a que WireMock esté listo (evita carreras tras .start()).
 */
async function waitForWireMock(base: string, attempts = 12, delayMs = 500) {
    for (let i = 0; i < attempts; i++) {
        try {
            const res = await fetch(`${base}/__admin/mappings`);
            if (res.ok) return;
        } catch {
            // ignore and retry
        }
        await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(`WireMock no respondió en ${attempts * delayMs} ms (${base})`);
}

export default async function globalSetup(config: FullConfig) {
    mkdirSync(".auth", { recursive: true });

    if (ENV.AUTH_MODE === "mock") {
        log.step("Iniciando WireMock en contenedor (modo mock)…");

        let wiremock: StartedTestContainer | undefined;
        try {
            wiremock = await new GenericContainer("wiremock/wiremock:3.9.1")
                .withExposedPorts(8080)
                .start();

            // 👇 Docker-friendly: usa host y puerto que expone Testcontainers
            const port = wiremock.getMappedPort(8080);
            const host = wiremock.getHost();
            const base = `http://${host}:${port}`;

            // Asegura que el admin endpoint responde antes de mapear
            await waitForWireMock(base);

            // ✅ Mapping de /auth/login
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
                            expiresIn: 3600,
                        },
                    },
                }),
            });

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

            // ✅ Generar storageState con login UI (neutral a navegador)
            const browser = await chromium.launch({ headless: true });
            const context = await browser.newContext();
            const page = await context.newPage();

            // (Opcional) guardar token mock para trazabilidad
            await page.addInitScript((token: string) => {
                localStorage.setItem("auth-token", token);
            }, (json as any).token);

            await page.goto(ENV.BASE_URL);
            await page.fill("#user-name", ENV.AUTH_USER);
            await page.fill("#password", ENV.AUTH_PASSWORD);
            await page.click("#login-button");

            // Asegura que realmente estás dentro antes de guardar estado
            await page.waitForURL("**/inventory.html");
            await page.locator(".inventory_item").first().waitFor({ state: "visible", timeout: 10_000 });

            await context.storageState({ path: STORAGE_PATH });
            await browser.close();

            log.ok(`storageState generado en ${STORAGE_PATH} (modo mock)`);
            return;
        } finally {
            // Cierra el contenedor de WireMock aunque falle algo
            if (wiremock) {
                await wiremock.stop().catch(() => {});
            }
        }
    }

    // ✅ Modo REAL
    log.step("Login UI en SauceDemo (modo real)…");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(ENV.BASE_URL);
    await page.fill("#user-name", ENV.AUTH_USER);
    await page.fill("#password", ENV.AUTH_PASSWORD);
    await page.click("#login-button");

    await page.waitForURL("**/inventory.html");
    await page.locator(".inventory_item").first().waitFor({ state: "visible", timeout: 10_000 });

    await context.storageState({ path: STORAGE_PATH });
    await browser.close();
    log.ok(`storageState generado en ${STORAGE_PATH} (modo real)`);
}
