FROM node:22-bookworm-slim

# openssl serve a Prisma
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

ENV NODE_ENV=production \
    DATA_DIR=/data \
    NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000

# Applica le migrazioni, popola categorie/comuni (solo la prima volta) e avvia.
CMD ["npm", "run", "start:prod"]
