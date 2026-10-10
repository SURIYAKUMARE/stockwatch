FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY scripts/ ./scripts/

ENV PYTHONPATH=/app

CMD ["sh", "-c", "python -m backend.seed && uvicorn backend.app.main:app --host 0.0.0.0 --port 8000"]
