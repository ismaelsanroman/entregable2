import * as dotenv from "dotenv";
import { existsSync } from "fs";

const envFile =
    process.env.NODE_ENV === "production"
        ? ".env.prod"
        : process.env.NODE_ENV === "staging"
            ? ".env.staging"
            : ".env";

if (existsSync(envFile)) {
    dotenv.config({ path: envFile });
} else {
    dotenv.config();
}

export const ENV = {
    BASE_URL: process.env.BASE_URL ?? "https://www.saucedemo.com",
    HEADLESS: (process.env.HEADLESS ?? "true").toLowerCase() === "true",
    AUTH_USER: process.env.AUTH_USER ?? "standard_user",
    AUTH_PASSWORD: process.env.AUTH_PASSWORD ?? "secret_sauce",
    AUTH_MODE: process.env.AUTH_MODE ?? "real", // "real" | "mock"
};