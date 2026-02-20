FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --ignore-scripts && npx prisma generate
COPY . .
# tsconfig.base.json はmonorepoルートにあるため、Docker内用に生成
RUN echo '{"compilerOptions":{"target":"ES2022","module":"commonjs","lib":["ES2022"],"strict":true,"esModuleInterop":true,"skipLibCheck":true,"forceConsistentCasingInFileNames":true,"resolveJsonModule":true,"declaration":true,"declarationMap":true,"sourceMap":true}}' > /app/tsconfig.base.json
RUN sed -i 's|../../tsconfig.base.json|./tsconfig.base.json|' tsconfig.json
RUN npm run build

FROM node:20-alpine
RUN apk add --no-cache openssl curl
RUN addgroup -g 1001 -S mamori && adduser -S mamori -u 1001 -G mamori
WORKDIR /app
COPY --from=builder --chown=mamori:mamori /app/dist ./dist
COPY --from=builder --chown=mamori:mamori /app/node_modules ./node_modules
COPY --from=builder --chown=mamori:mamori /app/package*.json ./
COPY --from=builder --chown=mamori:mamori /app/prisma ./prisma
ENV PORT=3000
USER mamori
EXPOSE ${PORT}
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/v1/health || exit 1
CMD sh -c "npx prisma migrate deploy && node dist/main"
