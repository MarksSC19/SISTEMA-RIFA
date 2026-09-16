# Dockerfile de Producción - Plataforma Gran Rifa 2026
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Compilar frontend para producción
RUN npm run build

# Imagen de ejecución final optimizada
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm install -g tsx

# Copiar bundles compilados y servidor
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/src ./src

EXPOSE 3000

CMD ["npm", "run", "start"]
