/**
 * 🧪 Inventario — sesión reutilizada
 *
 * Qué valida este test:
 * - Que el usuario (ya autenticado vía `storageState` generado en `globalSetup`) puede acceder al inventario.
 * - Que se visualizan productos en la página de inventario.
 * - Que es posible añadir el primer producto al carrito y que el contador del carrito se actualiza a "1".
 *
 * Supuestos previos:
 * - `baseURL` está configurado en `playwright.config.ts` (se usa `page.goto("/inventory.html")` con URL relativa).
 * - La sesión está activa gracias a `storageState` (si no, el flujo podría redirigir al login).
 *
 * Observabilidad:
 * - Se usan logs funcionales con `log.step(...)` y `log.ok(...)` para trazar acciones clave en el reporte (Allure/HTML).
 */

import { test, expect } from "@playwright/test";
import { log } from "../src/support/logger";

test.describe("Inventario – sesión reutilizada", () => {
    test("debe mostrar productos y permitir añadir al carrito", async ({ page }) => {
        // 🌍 1) Navega a la página de inventario usando la baseURL configurada
        //    - Si `storageState` es válido, no debería pedir login.
        log.step("Abriendo inventario…");
        await page.goto("/inventory.html");

        // 🔎 2) Asegura que estamos en la URL correcta y que hay al menos un ítem visible
        //    - `toHaveURL` confirma la ruta esperada.
        await expect(page).toHaveURL(/inventory\.html/);

        //    - Espera explícita para el primer ".inventory_item" (con timeout más laxo por carga inicial).
        await expect(page.locator(".inventory_item").first()).toBeVisible({ timeout: 10_000 });

        //    - (Opcional/Redundante) Segunda verificación de visibilidad sin timeout custom.
        //      Mantenerla puede ser útil como aserción adicional; si no aporta, se puede eliminar.
        await expect(page.locator(".inventory_item").first()).toBeVisible();

        // 🛒 3) Añade el primer producto al carrito
        //    - Selecciona el primer botón con texto "Add to cart".
        //      Sugerencia: si la app lo permite, considera usar selectores más robustos (data-testid/data-test).
        log.step("Añadiendo el primer producto al carrito…");
        const firstAddBtn = page.locator("button:has-text('Add to cart')").first();
        await firstAddBtn.click();

        // 🧮 4) Verifica el badge del carrito en 1 (confirmación de que se añadió el ítem)
        const cartBadge = page.locator(".shopping_cart_badge");
        await expect(cartBadge).toHaveText("1");

        // ✅ 5) Log de éxito legible en reportes
        log.ok("Producto añadido correctamente ✅");
    });
});
