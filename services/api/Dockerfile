FROM node:25-alpine AS builder
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

FROM node:25-alpine
RUN apk add --no-cache openssl curl
RUN addgroup -g 1001 -S mamori && adduser -S mamori -u 1001 -G mamori
WORKDIR /app
COPY --from=builder --chown=mamori:mamori /app/dist ./dist
COPY --from=builder --chown=mamori:mamori /app/node_modules ./node_modules
COPY --from=builder --chown=mamori:mamori /app/package*.json ./
COPY --from=builder --chown=mamori:mamori /app/prisma ./prisma
USER mamori
EXPOSE 3000
CMD sh -c "npx prisma migrate deploy && node dist/main"
