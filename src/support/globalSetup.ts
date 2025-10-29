import { FullConfig, request, chromium } from "@playwright/test";
import { GenericContainer, Wait } from "testcontainers";
import { parseAuthResponse } from "../../config/schemas/auth";
import fs from "node:fs/promises";
import path from "node:path";

export default async function globalSetup(config: FullConfig) {
    console.log("🚀 Iniciando Mock de Autenticación con Testcontainers (WireMock)...");

    // 1) Arrancar WireMock efímero
    const wiremock = await new GenericContainer("wiremock/wiremock:3.9.1")
        .withExposedPorts(8080)
        .withWaitStrategy(Wait.forLogMessage("verbose:"))
        .withReuse()
        .start();

    // ⚠️ Usar host real (en Docker no es "localhost")
    const host = wiremock.getHost();
    const port = wiremock.getMappedPort(8080);
    const mockBaseUrl = `http://${host}:${port}`;
    console.log(`🌍 WireMock en ${mockBaseUrl}`);

    // 2) Sembrar stub /auth/login que cumple el schema (Zod)
    const stubPayload = {
        request: { method: "POST", url: "/auth/login" },
        response: {
            status: 200,
            headers: { "Content-Type": "application/json" },
            jsonBody: {
                token: "TEST_TOKEN_12345", // ≥ 10 chars
                user: { id: 1, username: "demo", roles: ["user", "admin"] },
                // Puedes devolver expiresIn o expiresAt
                expiresAt: "2099-01-01T00:00:00Z",
            },
        },
    };

    const seedRes = await fetch(`${mockBaseUrl}/__admin/mappings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(stubPayload),
    });
    if (!seedRes.ok) throw new Error("❌ Seed de WireMock falló");
    console.log("🌱 Stub /auth/login creado");

    // 3) Llamar al mock y validar/normalizar con Zod
    const api = await request.newContext({ baseURL: mockBaseUrl });
    const res = await api.post("/auth/login", { data: { user: "demo", pass: "demo" } });
    if (!res.ok()) throw new Error(`Auth mock devolvió ${res.status()}`);
    const auth = parseAuthResponse(await res.json());
    console.log("✅ Auth normalizado:", { token: auth.token.slice(0, 6) + "…", expiresIn: auth.expiresIn });

    // 4) Generar .auth/storageState.json
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    // BaseURL desde playwright.config (primer proyecto) o fallback
    const baseURL = (config.projects?.[0]?.use as any)?.baseURL ?? "https://www.saucedemo.com";
    const base = new URL(baseURL);

    if (base.hostname.includes("saucedemo.com")) {
        // 🔐 SauceDemo requiere login UI (la cookie custom no sirve)
        const user = process.env.SAUCE_USER ?? "standard_user";
        const pass = process.env.SAUCE_PASS ?? "secret_sauce";

        console.log("🔐 Login UI en SauceDemo…");
        await page.goto(baseURL, { waitUntil: "domcontentloaded" });
        await page.getByPlaceholder("Username").fill(user);
        await page.getByPlaceholder("Password").fill(pass);
        await page.getByRole("button", { name: "Login" }).click();
        await page.waitForURL(/\/inventory\.html$/, { timeout: 15_000 });
        console.log("✅ Login UI OK → /inventory.html");
    } else {
        // 🍪 Para tu AUT real que acepte token/cookie
        console.log("🍪 Seteando cookie de auth para dominio de la AUT…");
        await context.addCookies([
            {
                name: "auth_token",
                value: auth.token,
                domain: base.hostname,
                path: "/",
                httpOnly: false,
                secure: false,
                sameSite: "Lax",
            },
        ]);
        // Alternativa para localStorage:
        // await page.goto(baseURL);
        // await page.evaluate((t) => localStorage.setItem("auth_token", t), auth.token);
    }

    // Guardar storageState
    const authDir = path.resolve(".auth");
    await fs.mkdir(authDir, { recursive: true });
    await context.storageState({ path: path.join(authDir, "storageState.json") });
    await browser.close();

    process.env.MOCK_AUTH_URL = mockBaseUrl;
    console.log("💾 .auth/storageState.json generado con éxito");
}
