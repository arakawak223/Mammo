FROM python:3.12-slim AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
RUN addgroup --gid 1001 mamori && adduser --disabled-password --uid 1001 --gid 1001 mamori

WORKDIR /app
COPY --from=builder /install /usr/local
COPY --chown=mamori:mamori app ./app

USER mamori
EXPOSE 8000
CMD sh -c "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
