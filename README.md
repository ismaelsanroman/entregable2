# Construir imagen
Docker build -t e2-playwright .


# Ejecutar tests (montando reports y storageState en el host)
Docker run --rm \
-e BASE_URL=https://www.saucedemo.com \
-e AUTH_MODE=real \
-v $PWD/reports:/app/reports \
-v $PWD/.auth:/app/.auth \
e2-playwright


# Ejecutar en modo MOCK
Docker run --rm \
-e AUTH_MODE=mock \
-v $PWD/.auth:/app/.auth \
e2-playwright


# 🧪 Entregable 2 – Playwright + TS


## Requisitos
- Node 20+
- (Opcional) Java Runtime para `allure` CLI (Dockerfile ya lo instala)


## Instalación
```bash
npm ci
npx playwright install --with-deps