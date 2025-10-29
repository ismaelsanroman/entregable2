import { test, expect } from "@playwright/test";
import { ENV } from "../../config/env";

test.describe("@smoke auth state", () => {
    test("storageState / sesión reutilizada según entorno", async ({ page }) => {
        // 1) Caso AUT con cookie/token (no SauceDemo): valida cookie si existe
        const cookies = await page.context().cookies();
        const authCookie = cookies.find((c) => c.name === "auth_token");
        if (authCookie) {
            expect(authCookie.value.length).toBeGreaterThan(0);
            return;
        }

        // 2) SauceDemo: ir directo a /inventory.html y validar DOM
        const isSauce = (ENV.BASE_URL || "").includes("saucedemo.com");
        if (isSauce) {
            await page.goto("/inventory.html", { waitUntil: "domcontentloaded" });
            await expect(page).toHaveURL(/\/inventory\.html$/);
            await expect(page.locator(".inventory_list")).toBeVisible();
            return;
        }

        // 3) Si no es cookie ni SauceDemo, indica ajustar el smoke a tu AUT
        throw new Error(
            "Ni cookie 'auth_token' ni entorno SauceDemo detectado. Ajusta el smoke a tu AUT (cookie/localStorage/elementos de página)."
        );
    });
});
