/**
 * 📝 Logger mínimo con iconos para trazabilidad en consola y reportes.
 *
 * Propósito:
 * - Ofrecer una API muy simple y legible para anotar pasos, éxitos, avisos y errores.
 * - Los mensajes se capturan en la salida estándar y suelen quedar reflejados en reportes
 *   (p. ej., consola del job CI, reporter HTML, etc.).
 *
 * Convención de iconos:
 * - 🔍 step: describe una acción/chequeo intermedio dentro del flujo del test.
 * - ✅ ok  : confirma que una verificación/acción terminó correctamente.
 * - ⚠️ warn: advierte de algo no bloqueante pero que merece atención.
 * - 🧯 err : registra un error relevante (ideal para tu “diccionario de errores” global).
 *
 * Uso típico:
 *   log.step("Abriendo inventario…");
 *   // ...acción...
 *   log.ok("Inventario visible");
 *
 * Nota:
 * - Si más adelante integras Allure u otro reporter, puedes envolver estas funciones
 *   para crear "steps" o adjuntar artefactos sin cambiar las llamadas en los tests.
 */
export const log = {
    /** Describe una acción o checkpoint dentro del flujo. Útil para “narrar” el test. */
    step: (msg: string) => console.log(`🔍 ${msg}`),

    /** Confirma el éxito de una verificación/acción. Útil para hitos o estados finales. */
    ok: (msg: string) => console.log(`✅ ${msg}`),

    /** Registra avisos no bloqueantes (degradaciones, timeouts puntuales, etc.). */
    warn: (msg: string) => console.warn(`⚠️ ${msg}`),

    /** Registra errores importantes (ideal para acumular en un diccionario global). */
    err: (msg: string) => console.error(`🧯 ${msg}`),
};

/*
 * 💡 (Opcional) Integración con Allure:
 *
 * Si usas `allure-playwright`, puedes envolver cada método para crear un "step" en Allure.
 * Ejemplo de idea (referencia, no implementado aquí):
 *
 *   import { allure } from "allure-playwright";
 *   step: (msg: string) => { console.log(`🔍 ${msg}`); return allure.step(msg, async () => {}); }
 *
 * También podrías adjuntar datos/JSON en `err` o `warn` con:
 *   allure.attachment("context", JSON.stringify(data, null, 2), "application/json");
 */
