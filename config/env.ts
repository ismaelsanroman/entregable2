/**
 * ⚙️ Carga y normalización de variables de entorno (ENV)
 *
 * Propósito:
 * - Seleccionar el fichero `.env` adecuado según `NODE_ENV` (prod/staging/dev).
 * - Cargar variables de entorno con `dotenv` y exponer un objeto `ENV` tipado de forma básica.
 * - Proveer valores por defecto seguros para ejecución local y CI.
 *
 * Reglas de selección del archivo .env:
 * - NODE_ENV = "production" → usa `.env.prod`
 * - NODE_ENV = "staging"    → usa `.env.staging`
 * - Cualquier otro caso     → usa `.env`
 *
 * Notas de uso:
 * - En CI, normalmente usarás secretos del sistema; el archivo .env puede no existir.
 * - `HEADLESS` se interpreta como booleano (string "true"/"false" → boolean).
 * - `AUTH_MODE` admite "real" | "mock" (por defecto "real").
 *
 * Sugerencias (no implementadas aquí):
 * - Validar el shape de ENV con Zod para fallar rápido en arranque si faltan variables críticas.
 * - Permitir booleanos tipo "1"/"0" además de "true"/"false".
 */

import * as dotenv from "dotenv";
import { existsSync } from "fs";

// 🗂️ Determina el archivo .env según el valor de NODE_ENV.
//   - production → .env.prod
//   - staging    → .env.staging
//   - default    → .env
const envFile =
    process.env.NODE_ENV === "production"
        ? ".env.prod"
        : process.env.NODE_ENV === "staging"
            ? ".env.staging"
            : ".env";

// 📥 Carga de variables de entorno:
//   - Si existe el archivo específico, se usa ese.
//   - En caso contrario, se intenta cargar el .env por defecto del proyecto (si lo hubiera)
//     o se mantienen únicamente las variables ya presentes en el entorno del proceso.
if (existsSync(envFile)) {
    dotenv.config({ path: envFile });
} else {
    dotenv.config();
}

// 🌍 Objeto ENV: punto único de acceso a la configuración de entorno para el resto del código.
//   - Incluye valores por defecto sensatos para ejecución local (SauceDemo).
//   - HEADLESS se normaliza a booleano interpretando el string (case-insensitive).
//   - AUTH_MODE determina el modo de autenticación: "real" (app real) o "mock" (servicio simulado).
export const ENV = {
    // URL base de la aplicación bajo prueba (p. ej., SauceDemo)
    BASE_URL: process.env.BASE_URL ?? "https://www.saucedemo.com",

    // Ejecutar navegador en modo headless (interpreta "true"/"false"; por defecto true)
    HEADLESS: (process.env.HEADLESS ?? "true").toLowerCase() === "true",

    // Credenciales de pruebas (para globalSetup / login UI)
    AUTH_USER: process.env.AUTH_USER ?? "standard_user",
    AUTH_PASSWORD: process.env.AUTH_PASSWORD ?? "secret_sauce",

    // Modo de autenticación:
    // - "real": login contra la app real.
    // - "mock": login contra mock (WireMock/Testcontainers), útil para entornos aislados.
    AUTH_MODE: process.env.AUTH_MODE ?? "real", // "real" | "mock"
};
