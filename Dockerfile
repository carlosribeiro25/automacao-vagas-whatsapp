FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:22-alpine

# Chromium e dependências necessárias para o whatsapp-web.js (Puppeteer)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

# Diz ao Puppeteer para usar o Chromium do sistema, não baixar o próprio
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src ./src

EXPOSE 3333

CMD ["node", "dist/server.js"]