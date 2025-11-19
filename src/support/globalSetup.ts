/**
 * 🌐 globalSetup (Playwright)
 *
 * Responsabilidades:
 * 1) Levantar un **mock de autenticación** efímero con **Testcontainers + WireMock**.
 * 2) Sembrar un stub `POST /auth/login` y **validar/normalizar** su respuesta con **Zod**
 *    (ver: config/schemas/auth.ts → parseAuthResponse).
 * 3) Realizar el **login** antes de los tests y generar `.auth/storageState.json` para
 *    que todos los proyectos compartan sesión.
 *
 * Estrategia de login:
 * - Si `BASE_URL` contiene `saucedemo.com` → **login UI real** (porque SauceDemo usa
 *   sessionStorage y no acepta tu cookie custom).
 * - Si no es SauceDemo → inyecta **cookie** con el token del mock (o usa localStorage,
 *   ver bloque comentado).
 *
 * Notas de infra:
 * - **Docker**: dentro del contenedor NO uses `localhost`. Se usa `container.getHost()`
 *   y `getMappedPort()` para construir `mockBaseUrl` (evita ECONNREFUSED).
 * - **Reuse**: `.withReuse()` permite reciclar el contenedor (requiere
 *   `~/.testcontainers.properties` con `testcontainers.reuse.enable=true` en local).
 * - **Ciclo de vida**: no detenemos WireMock aquí porque Testcontainers gestiona el
 *   ciclo y/o reuse. Si prefieres parar, hazlo en un `globalTeardown`.
 */

import { FullConfig, request, chromium } from "@playwright/test";
import { GenericContainer, Wait } from "testcontainers";
import { parseAuthResponse } from "../../config/schemas/auth";
import fs from "node:fs/promises";
import path from "node:path";

/**
 * Hook global de Playwright que se ejecuta **una vez** antes de toda la suite.
 * @param config FullConfig - Configuración completa de Playwright (projects, use, etc.)
 */
export default async function globalSetup(config: FullConfig) {
    console.log("🚀 Iniciando Mock de Autenticación con Testcontainers (WireMock)...");

    /* ------------------------------------------------------------------------ */
    /* 1) Arrancar WireMock efímero (Testcontainers)                            */
    /* ------------------------------------------------------------------------ */
    const wiremock = await new GenericContainer("wiremock/wiremock:3.9.1")
        .withExposedPorts(8080)                       // Exponer el puerto de la app dentro del contenedor
        .withWaitStrategy(Wait.forLogMessage("verbose:")) // Espera a que WireMock esté listo por logs
        .withReuse()                                  // Reusar contenedor (si está habilitado en local)
        .start();

    // ⚠️ Dentro de Docker, el host NO es "localhost". Testcontainers da el host correcto.
    const host = wiremock.getHost();
    const port = wiremock.getMappedPort(8080);
    const mockBaseUrl = `http://${host}:${port}`;
    console.log(`🌍 WireMock en ${mockBaseUrl}`);

    /* ------------------------------------------------------------------------ */
    /* 2) Sembrar stub /auth/login que cumple el contrato (Zod)                 */
    /* ------------------------------------------------------------------------ */
    // Respuesta mínima válida para nuestro schema Zod (token ≥ 10 chars)
    const stubPayload = {
        request: { method: "POST", url: "/auth/login" },
        response: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            jsonBody: {
                token: "TEST_TOKEN_12345",                 // ≥ 10 chars (ver AuthResponseSchema)
                user: { id: 1, username: "demo", roles: ["user", "admin"] },
                // Puedes devolver expiresIn (segundos) o expiresAt (ISO). Aquí usamos expiresAt.
                expiresAt: "2099-01-01T00:00:00Z",
            },
        },
    };

    // Sembrar el stub en WireMock
    const seedRes = await fetch(`${mockBaseUrl}/__admin/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stubPayload),
    });
    if (!seedRes.ok) throw new Error("❌ Seed de WireMock falló");
    console.log("🌱 Stub /auth/login creado");

    /* ------------------------------------------------------------------------ */
    /* 3) Llamar al mock y validar/normalizar con Zod                           */
    /* ------------------------------------------------------------------------ */
    const api = await request.newContext({ baseURL: mockBaseUrl });
    const res = await api.post("/auth/login", { data: { user: "demo", pass: "demo" } });
    if (!res.ok()) throw new Error(`Auth mock devolvió ${res.status()}`);

    // parseAuthResponse lanza con razones si no cumple el contrato
    const auth = parseAuthResponse(await res.json());
    console.log("✅ Auth normalizado:", {
        token: auth.token.slice(0, 6) + "…",
        expiresIn: auth.expiresIn,
    });

    /* ------------------------------------------------------------------------ */
    /* 4) Generar .auth/storageState.json (reutilización de sesión)             */
    /* ------------------------------------------------------------------------ */
    const browser = await chromium.launch();
    const context = await browser.newContext();   // Contexto “limpio” para persistir estado
    const page = await context.newPage();

    // BaseURL desde el primer proyecto configurado o fallback a SauceDemo
    const baseURL = (config.projects?.[0]?.use as any)?.baseURL ?? "https://www.saucedemo.com";
    const base = new URL(baseURL);

    if (base.hostname.includes("saucedemo.com")) {
        // 🔐 SauceDemo: requiere **login UI**; la cookie custom no funciona (usa sessionStorage)
        const user = process.env.SAUCE_USER ?? "standard_user";
        const pass = process.env.SAUCE_PASS ?? "secret_sauce";

        console.log("🔐 Login UI en SauceDemo…");
        await page.goto(baseURL, { waitUntil: "domcontentloaded" });
        await page.getByPlaceholder("Username").fill(user);
        await page.getByPlaceholder("Password").fill(pass);
        await page.getByRole("button", { name: "Login" }).click();
        await page.waitForURL(/\/inventory\.html$/, { timeout: 15_000 });
        console.log("✅ Login UI OK → /inventory.html");

        // 🔎 Nota: Playwright no persiste sessionStorage en storageState, pero tras
        // guardar el contexto con la navegación a /inventory.html, el smoke navega
        // directamente a /inventory.html y valida DOM (ver tests/smoke/auth-state.spec.ts).
    } else {
        // 🍪 AUT real (cookie/token): inyectamos una cookie de auth con el token del mock.
        console.log("🍪 Seteando cookie de auth para dominio de la AUT…");
        await context.addCookies([
            {
                name: "auth_token",
                value: auth.token,
                domain: base.hostname, // Importante: dominio correcto
                path: "/",
                httpOnly: false,
                secure: false,
                sameSite: "Lax",
            },
        ]);

        // 🔄 Alternativa si tu AUT usa localStorage:
        // await page.goto(baseURL);
        // await page.evaluate((t) => localStorage.setItem("auth_token", t), auth.token);
        // (Recuerda que localStorage sí persiste en storageState si navegas antes de guardarlo)
    }

    // Asegura carpeta .auth/ y persiste el estado
    const authDir = path.resolve(".auth");
    await fs.mkdir(authDir, { recursive: true });
    await context.storageState({ path: path.join(authDir, "storageState.json") });
    await browser.close();

    // Exponer la URL del mock (útil si quieres usarla en tests)
    process.env.MOCK_AUTH_URL = mockBaseUrl;
    console.log("💾 .auth/storageState.json generado con éxito");

    /* ------------------------------------------------------------------------ */
    /*  🧹 Notas de limpieza                                                     */
    /* ------------------------------------------------------------------------ */
    // - Con .withReuse(), Testcontainers recicla el contenedor (local).
    // - En CI, el proceso de tests terminará y Testcontainers limpiará los recursos.
    // - Si prefieres parar explícitamente el contenedor aquí:
    //     await wiremock.stop();
    //   (Recomendación: usa reuse en local y limpieza automática en CI.)
}
