import { z } from "zod";


export const AuthResponseSchema = z.object({
    token: z.string().min(10),
    user: z.object({
        id: z.number().int().positive(),
        username: z.string().min(3),
        roles: z.array(z.string()).default(["user"]).optional(),
    }),
    expiresIn: z.number().int().positive().optional(),
});


export type AuthResponse = z.infer<typeof AuthResponseSchema>;