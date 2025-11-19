# -----------------------------------------------------------------------------
# 📦 Dockerfile — Playwright E2E (Chromium/Firefox/WebKit)
#
# Propósito:
# - Construir una imagen reproducible que contenga:
#   · Runtime Playwright (con navegadores) alineado a una versión.
#   · Dependencias Node del proyecto (npm ci).
#   · Rutas de artefactos (.auth, reports, test-results) listas para uso en CI/local.
#   · (Opcional) Java (JRE) para generar/abrir reportes Allure dentro del contenedor.
#
# Notas:
# - Se usa la imagen base oficial de Playwright (incluye navegadores y deps del sistema).
# - Se crean y otorgan permisos a rutas cuando NO se bind-montan desde el host.
# - Se ejecuta como usuario no root (pwuser) para tests; se eleva a root solo para
#   preparar directorios e instalar paquetes del sistema (Java).
# -----------------------------------------------------------------------------

# Usa sintaxis moderna de Dockerfile (requerido para algunas features)
# (No cambia el contenido de la imagen; solo cómo se interpreta este Dockerfile).
# syntax=docker/dockerfile:1

# ARG para pinnear la versión de Playwright (alineado con @playwright/test)
ARG PLAYWRIGHT_VERSION=1.56.1

# Imagen base oficial de Playwright con navegadores y dependencias del sistema
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-jammy

# Directorio de trabajo (HOME del usuario pwuser en la imagen base)
WORKDIR /home/pwuser/app

# -------------------------------------------------------------------
# 🧩 Dependencias Node (aprovecha cache de capas cuando package*.json no cambia)
# -------------------------------------------------------------------

# Copiamos solo manifests para maximizar cache de capa
COPY package*.json ./

# Instalación determinista de deps (npm ci falla si falta package-lock.json)
RUN npm ci

# -------------------------------------------------------------------
# 📦 Código de la aplicación (se invalida cache cuando cambia el código)
# -------------------------------------------------------------------
COPY . .

# -------------------------------------------------------------------
# 🗂️ Preparación de rutas y permisos (cuando NO hay volúmenes montados)
# -------------------------------------------------------------------

# Cambiamos a root temporalmente para crear rutas y ajustar ownership
USER root

# Crea rutas de artefactos y asegura propiedad para pwuser
# - reports/html           → reporte HTML
# - .auth                  → storageState (sesión compartida)
# - test-results           → traces, screenshots, videos por defecto de Playwright
RUN mkdir -p /home/pwuser/app/reports/html /home/pwuser/app/.auth /home/pwuser/app/test-results \
 && chown -R pwuser:pwuser /home/pwuser/app

# -------------------------------------------------------------------
# ☕ (Opcional) Java para Allure dentro del contenedor
# -------------------------------------------------------------------

# Instala JRE si quieres generar/abrir Allure en el contenedor
# (Si Allure se consume fuera del contenedor, puedes omitir este bloque)
RUN apt-get update \
 && apt-get install -y --no-install-recommends openjdk-17-jre-headless \
 && rm -rf /var/lib/apt/lists/*

# Volvemos al usuario no root para ejecutar tests con permisos mínimos
USER pwuser

# -------------------------------------------------------------------
# ▶️ Comando por defecto: ejecutar tests (ajústalo a tu script npm)
# -------------------------------------------------------------------
CMD ["npm","run","test"]
