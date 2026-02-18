FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

RUN addgroup --gid 1001 mamori && adduser --disabled-password --uid 1001 --gid 1001 mamori

COPY --chown=mamori:mamori app ./app

USER mamori

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
