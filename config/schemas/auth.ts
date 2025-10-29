/**
 * 🧾 AuthResponseSchema (Zod)
 *
 * - Valida y normaliza la respuesta de autenticación (mock/real).
 * - Devuelve siempre `expiresIn` (si llega `expiresAt`, se transforma).
 * - Proporciona tipos TS derivados.
 */

import { z } from "zod";

const RolesSchema = z
    .array(z.string().min(1).transform((s) => s.trim()))
    .default(["user"])
    .optional();

const BaseSchema = z.object({
    token: z.string().min(10).transform((s) => s.trim()),
    user: z.object({
        id: z.number().int().positive(),
        username: z.string().min(3).transform((s) => s.trim()),
        roles: RolesSchema,
    }),
    // Permite una u otra forma de expiración
    expiresIn: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
});

export const AuthResponseSchema = BaseSchema.superRefine((obj, ctx) => {
    if (!obj.expiresIn && !obj.expiresAt) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe incluirse `expiresIn` o `expiresAt`.",
            path: ["expiresIn"],
        });
    }
}).transform((obj) => {
    const roles = Array.from(
        new Set((obj.user.roles ?? ["user"]).map((r) => r.trim()).filter(Boolean))
    );

    const secondsFromAt =
        obj.expiresAt
            ? Math.max(
                1,
                Math.floor((new Date(obj.expiresAt).getTime() - Date.now()) / 1000)
            )
            : undefined;

    return {
        token: obj.token,
        user: { id: obj.user.id, username: obj.user.username, roles },
        expiresIn: obj.expiresIn ?? secondsFromAt,
    };
});

// Tipo final después de la transformación
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

// Helper para parsear con mensajes claros
export function parseAuthResponse(data: unknown): AuthResponse {
    const result = AuthResponseSchema.safeParse(data);
    if (!result.success) {
        const reasons = result.error.errors
            .map((e) => `• ${e.path.join(".") || "(root)"}: ${e.message}`)
            .join("\n");
        throw new Error(`AuthResponse inválido:\n${reasons}`);
    }
    return result.data;
}
