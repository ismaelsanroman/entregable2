import { defineConfig, devices } from "@playwright/test";
import { ENV } from "./config/env";

export default defineConfig({
    testDir: "./tests",
    timeout: 30_000,
    retries: 1,
    reporter: [
        ["line"],
        ["allure-playwright"],
        ["html", { outputFolder: "reports/html", open: "never" }],
    ],
    use: {
        baseURL: ENV.BASE_URL,
        storageState: ".auth/storageState.json",
        trace: "on-first-retry",
        screenshot: "only-on-failure",
        video: "retain-on-failure",
        headless: ENV.HEADLESS,
    },
    projects: [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox",  use: { ...devices["Desktop Firefox"] } },
        { name: "webkit",   use: { ...devices["Desktop Safari"] } },
    ],
    globalSetup: "./src/support/globalSetup.ts",
});
