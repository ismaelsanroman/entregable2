export const log = {
    step: (msg: string) => console.log(`🔍 ${msg}`),
    ok: (msg: string) => console.log(`✅ ${msg}`),
    warn: (msg: string) => console.warn(`⚠️ ${msg}`),
    err: (msg: string) => console.error(`🧯 ${msg}`),
};