FROM node:20-alpine AS builder
RUN apk add --no-cache openssl python3 make g++
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install && npx prisma generate
COPY . .
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl
RUN addgroup -g 1001 -S mamori && adduser -S mamori -u 1001 -G mamori
WORKDIR /app
COPY --from=builder --chown=mamori:mamori /app/dist ./dist
COPY --from=builder --chown=mamori:mamori /app/node_modules ./node_modules
COPY --from=builder --chown=mamori:mamori /app/package*.json ./
COPY --from=builder --chown=mamori:mamori /app/prisma ./prisma
USER mamori
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
