import { test, expect } from "@playwright/test";
import { log } from "../src/support/logger";

test.describe("Inventario – sesión reutilizada", () => {
    test("debe mostrar productos y permitir añadir al carrito", async ({ page }) => {
        log.step("Abriendo inventario…");
        await page.goto("/inventory.html");

        await expect(page.locator(".inventory_item").first()).toBeVisible();

        log.step("Añadiendo el primer producto al carrito…");
        const firstAddBtn = page.locator("button:has-text('Add to cart')").first();
        await firstAddBtn.click();

        const cartBadge = page.locator(".shopping_cart_badge");
        await expect(cartBadge).toHaveText("1");

        log.ok("Producto añadido correctamente ✅");
    });
});
