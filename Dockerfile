# syntax=docker/dockerfile:1
ARG PLAYWRIGHT_VERSION=1.56.1
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy

WORKDIR /home/pwuser/app

# Dependencias Node
COPY package*.json ./
RUN npm ci

# Código
COPY . .

# Crear rutas y dar permisos cuando NO se bind-montan desde host
USER root
RUN mkdir -p /home/pwuser/app/reports/html /home/pwuser/app/.auth /home/pwuser/app/test-results \
 && chown -R pwuser:pwuser /home/pwuser/app

# (Opcional) Java para generar Allure dentro del contenedor
RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
 && rm -rf /var/lib/apt/lists/*

USER pwuser

# Ejecuta la suite por defecto
CMD ["npm","run","test"]
