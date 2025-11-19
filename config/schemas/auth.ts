/**
 * 🧾 AuthResponseSchema (Zod)
 *
 * Propósito:
 * - Validar y **normalizar** la respuesta de autenticación (mock o real).
 * - Tolerar dos modelos de expiración (`expiresIn` en segundos o `expiresAt` ISO)
 *   y **uniformar** siempre a `expiresIn`.
 * - Exponer tipos TypeScript derivados de forma segura y consistente.
 *
 * Decisiones:
 * - `token`: string mínimo 10 chars (evita tokens triviales); se hace trim.
 * - `user.username`: mínimo 3 chars; se hace trim.
 * - `user.roles`: opcional; si falta → `["user"]`. Se limpian espacios y duplicados.
 * - `expiresIn` vs `expiresAt`: se permite cualquiera de los dos, pero el objeto
 *   transformado **siempre** tendrá `expiresIn` (nunca `expiresAt`).
 *
 * Ejemplo de uso recomendado:
 *   import { parseAuthResponse } from "config/schemas/auth";
 *   const auth = parseAuthResponse(data); // ← lanza con detalles si no es válido
 *   // auth.expiresIn está siempre presente si venía expiresIn o expiresAt válido
 */

import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*  🔧 Configs reutilizables                                                   */
/* -------------------------------------------------------------------------- */

const MIN_TOKEN_LENGTH = 10;       // Longitud mínima de token aceptada
const MIN_USERNAME_LENGTH = 3;     // Longitud mínima de username

/* -------------------------------------------------------------------------- */
/*  🔠 RolesSchema                                                             */
/*  - Array de strings opcional.                                              */
/*  - Si falta, por defecto ["user"].                                         */
/*  - Se hace trim de cada rol y se filtrarán duplicados más abajo.           */
/* -------------------------------------------------------------------------- */
const RolesSchema = z
    .array(z.string().min(1).transform((s) => s.trim()))
    .default(["user"])
    .optional();

/* -------------------------------------------------------------------------- */
/*  🧱 BaseSchema                                                              */
/*  - Define la forma de entrada tal y como puede llegar del backend.         */
/*  - Acepta 'expiresIn' (segundos) o 'expiresAt' (ISO), o ambos.             */
/*  - No aplica aún normalización de roles/expiración.                         */
/* -------------------------------------------------------------------------- */
const BaseSchema = z.object({
    token: z.string().min(MIN_TOKEN_LENGTH).transform((s) => s.trim()),
    user: z.object({
        id: z.number().int().positive(),
        username: z.string().min(MIN_USERNAME_LENGTH).transform((s) => s.trim()),
        roles: RolesSchema,
    }),
    // Permite una u otra forma de expiración (o ambas)
    expiresIn: z.number().int().positive().optional(),
    expiresAt: z.string().datetime().optional(),
});

/* -------------------------------------------------------------------------- */
/*  ✅ AuthResponseSchema                                                      */
/*  - Valida que exista al menos uno: expiresIn o expiresAt.                  */
/*  - Transforma SIEMPRE a un objeto con:                                     */
/*      { token, user: { id, username, roles }, expiresIn }                   */
/*    (roles sin duplicados/espacios; expiresAt → expiresIn si aplica).       */
/* -------------------------------------------------------------------------- */
export const AuthResponseSchema = BaseSchema.superRefine((obj, ctx) => {
    // Regla: debe venir 'expiresIn' o 'expiresAt' (al menos uno)
    if (!obj.expiresIn && !obj.expiresAt) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Debe incluirse `expiresIn` o `expiresAt`.",
            path: ["expiresIn"], // apuntamos a expiresIn por conveniencia
        });
    }
}).transform((obj) => {
    // Normalizar roles (si faltaban, Zod ya aplicó ["user"] por defecto):
    // - trim ya aplicado
    // - quitar duplicados y vacíos (defensivo)
    const roles = Array.from(
        new Set((obj.user.roles ?? ["user"]).map((r) => r.trim()).filter(Boolean))
    );

    // Si vino 'expiresAt', lo convertimos a segundos (>= 1)
    const secondsFromAt =
        obj.expiresAt
            ? Math.max(
                1,
                Math.floor((new Date(obj.expiresAt).getTime() - Date.now()) / 1000)
            )
            : undefined;

    // Preferencia: si vino expiresIn, usamos ese; si no, el calculado desde expiresAt
    return {
        token: obj.token,
        user: { id: obj.user.id, username: obj.user.username, roles },
        expiresIn: obj.expiresIn ?? secondsFromAt,
    };
});

/* -------------------------------------------------------------------------- */
/*  🧾 Tipado derivado                                                         */
/*  - Tipo final del objeto ya transformado (sin expiresAt).                  */
/* -------------------------------------------------------------------------- */
export type AuthResponse = z.infer<typeof AuthResponseSchema>;

/* -------------------------------------------------------------------------- */
/*  🧪 parseAuthResponse                                                       */
/*  - Helper centralizado para parsear/validar con mensajes claros.           */
/*  - Lanza Error con listado de issues si el input no cumple el contrato.    */
/*                                                                            */
/*  @param data - Desconocido: lo que venga del backend/mock.                 */
/*  @returns AuthResponse - Objeto normalizado y tipeado.                     */
/*  @throws Error - Incluye todas las razones de validación fallida.          */
/*                                                                            */
/*  @example                                                                   *
*    try {                                                                     *
*      const auth = parseAuthResponse(await res.json());                       *
*      // auth.expiresIn siempre presente si el backend envió expiresIn/At     *
*    } catch (e) {                                                              *
*      console.error("Respuesta de auth inválida:", e);                        *
*    }                                                                          *
/* -------------------------------------------------------------------------- */
export function parseAuthResponse(data: unknown): AuthResponse {
    const result = AuthResponseSchema.safeParse(data);
    if (!result.success) {
        // Construimos un mensaje legible con todas las incidencias
        const reasons = result.error.errors
            .map((e) => `• ${e.path.join(".") || "(root)"}: ${e.message}`)
            .join("\n");
        throw new Error(`AuthResponse inválido:\n${reasons}`);
    }
    return result.data;
}
