/**
 * 🔎 @smoke auth state
 *
 * Propósito:
 * - Verificar que la **sesión persistida** por `globalSetup` se reutiliza correctamente.
 * - Soportar dos estrategias según el AUT:
 *    1) AUT real con **cookie/token** → valida existencia de la cookie `auth_token`.
 *    2) **SauceDemo** → no depende de cookie; valida navegación directa a `/inventory.html` y DOM.
 *
 * Contexto:
 * - SauceDemo usa `sessionStorage` internamente; `storageState` de Playwright **no** persiste
 *   `sessionStorage`. Por eso, el smoke navega directamente a `/inventory.html` (ruta protegida)
 *   para comprobar que el estado guardado permite acceder y ver el inventario.
 *
 * Notas:
 * - `ENV.BASE_URL` decide la rama de validación (contiene o no `saucedemo.com`).
 * - Si en tu AUT real usas **localStorage** en vez de cookie, adapta este test
 *   a la clave concreta (p.ej., leyendo/validando con `page.evaluate(...)`).
 */

import { test, expect } from "@playwright/test";
import { ENV } from "../../config/env";

test.describe("@smoke auth state", () => {
    test("storageState / sesión reutilizada según entorno", async ({ page }) => {
        /* ---------------------------------------------------------------------- */
        /* 1) Caso AUT con cookie/token: validar cookie 'auth_token' si existe     */
        /* ---------------------------------------------------------------------- */
        // El contexto de test ya cargó `.auth/storageState.json` (config.use.storageState)
        const cookies = await page.context().cookies();
        const authCookie = cookies.find((c) => c.name === "auth_token");

        if (authCookie) {
            // ✅ Cookie presente → validar que tiene valor no vacío
            expect(authCookie.value.length).toBeGreaterThan(0);
            return; // Fin del test en rama cookie
        }

        /* ---------------------------------------------------------------------- */
        /* 2) Caso SauceDemo: validar acceso directo a /inventory.html + DOM       */
        /* ---------------------------------------------------------------------- */
        const isSauce = (ENV.BASE_URL || "").includes("saucedemo.com");

        if (isSauce) {
            // ⚠️ En SauceDemo, la sesión depende de sessionStorage → ir directo a ruta protegida
            await page.goto("/inventory.html", { waitUntil: "domcontentloaded" });

            // URL correcta y lista de inventario visible
            await expect(page).toHaveURL(/\/inventory\.html$/);
            await expect(page.locator(".inventory_list")).toBeVisible();
            return; // Fin del test en rama SauceDemo
        }

        /* ---------------------------------------------------------------------- */
        /* 3) Caso no contemplado: AUT sin cookie y distinto de SauceDemo          */
        /* ---------------------------------------------------------------------- */
        // Si tu AUT no usa cookie y tampoco es SauceDemo, define aquí tu criterio:
        //   - Validación por localStorage
        //   - Chequeos de elementos del DOM tras navegación a una ruta protegida
        //   - Headers auth aplicados por fixtures, etc.
        throw new Error(
            "Ni cookie 'auth_token' ni entorno SauceDemo detectado. Ajusta el smoke a tu AUT (cookie/localStorage/elementos de página)."
        );
    });
});
