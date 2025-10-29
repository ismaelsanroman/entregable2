import { defineConfig, devices } from "@playwright/test";
import { ENV } from "./config/env"; // 🌍 Capa de configuración por entorno (BASE_URL, HEADLESS, etc.)

export default defineConfig({
    testDir: "./tests",
    timeout: 30_000,
    expect: { timeout: 10_000 },
    retries: 1,

    reporter: [
        ["line"],
        ["allure-playwright", { outputFolder: "reports/allure-results" }],
        ["html", { outputFolder: "reports/html", open: "never" }],
    ],

    use: {
        baseURL: ENV.BASE_URL,
        storageState: ".auth/storageState.json",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        headless: ENV.HEADLESS,
        navigationTimeout: 30_000,
    },

    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox",  use: { ...devices["Desktop Firefox"] } },
        { name: "webkit",   use: { ...devices["Desktop Safari"] } },
    ],

    globalSetup: require.resolve("./src/support/globalSetup.ts"),
});
