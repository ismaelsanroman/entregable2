FROM mcr.microsoft.com/playwright:stable


WORKDIR /app


# Dependencias node
COPY package*.json ./
RUN npm ci


# Copia del proyecto
COPY . .


# (Opcional si no usas la imagen oficial) Navegadores + deps
# RUN npx playwright install --with-deps


# Allure CLI requiere Java en algunos entornos
RUN apt-get update && apt-get install -y --no-install-recommends openjdk-17-jre-headless && rm -rf /var/lib/apt/lists/*


ENV NODE_ENV=production \
BASE_URL=https://www.saucedemo.com \
AUTH_MODE=real \
HEADLESS=true


# Ejecuta tests por defecto
CMD ["npm", "run", "test"]