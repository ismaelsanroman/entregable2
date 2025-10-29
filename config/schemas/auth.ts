/**
 * 🧾 AuthResponseSchema (Zod)
 *
 * Propósito:
 * - Definir y validar el contrato de la respuesta de autenticación (mock/real).
 * - Ofrecer **tipado derivado** (`AuthResponse`) para usar con seguridad en el código.
 *
 * Decisiones de contrato:
 * - `token`: string mínimo 10 chars para evitar tokens triviales.
 * - `user`: objeto con `id` numérico positivo, `username` mínimo 3 chars.
 * - `roles`: array de strings; por defecto ["user"] si no llega, y además es opcional
 *   (si no viene, Zod colocará ese default tras parsear).
 * - `expiresIn`: número entero positivo (segundos); es **opcional** porque hay backends
 *   que devuelven `expiresAt` (ISO) en lugar de duración. Si tu backend usa `expiresAt`,
 *   considera:
 *     1) añadir un campo alternativo, o
 *     2) transformar `expiresAt` → `expiresIn` en una capa de mapeo previa.
 *
 *   ¡Uso recomendado:
 *   const result = AuthResponseSchema.safeParse(data)
 *   if (! Result.success) {/* loguear issues y abortar */ /* }
 *   const auth = result.data // <- tipado seguro: AuthResponse
 */

import { z } from "zod";

export const AuthResponseSchema = z.object({
    // 🔐 Token de autenticación (mínimo 10 caracteres para cierta robustez)
    token: z.string().min(10),

    // 👤 Información básica de usuario autenticado
    user: z.object({
        // ID numérico entero y positivo
        id: z.number().int().positive(),

        // Username mínimo 3 caracteres (evita vacíos/ruidos)
        username: z.string().min(3),

        // Roles del usuario: si no llegan, se asigna ["user"] por defecto.
        // Marcado como opcional para tolerar backends que lo omiten por completo.
        roles: z.array(z.string()).default(["user"]).optional(),
    }),

    // ⏱️ Tiempo de expiración en segundos (si está disponible).
    // Si tu backend usa `expiresAt` (ISO), ajusta el contrato o aplica una transformación previa.
    expiresIn: z.number().int().positive().optional(),
});

// 🎯 Tipo TypeScript inferido a partir del esquema (siempre consistente con las reglas de Zod)
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
