FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci && npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl curl
RUN addgroup -g 1001 -S mamori && adduser -S mamori -u 1001 -G mamori
WORKDIR /app
COPY --from=builder --chown=mamori:mamori /app/dist ./dist
COPY --from=builder --chown=mamori:mamori /app/node_modules ./node_modules
COPY --from=builder --chown=mamori:mamori /app/package*.json ./
COPY --from=builder --chown=mamori:mamori /app/prisma ./prisma
USER mamori
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
