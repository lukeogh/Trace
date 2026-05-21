# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the React frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS frontend-builder

WORKDIR /build/frontend

# Install dependencies first (cache layer)
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ ./
RUN npm run build
# Output is at /build/frontend/dist


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Python backend serving API + compiled frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Backend source
COPY backend/ ./backend/

# Compiled frontend from Stage 1
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

# Runtime data directories (SQLite DB + file uploads live here)
RUN mkdir -p /data/uploads

ENV DB_PATH=/data/department.db
ENV UPLOAD_DIR=/data/uploads
ENV FRONTEND_DIST=/app/frontend/dist

EXPOSE 8000

WORKDIR /app/backend
# Run uvicorn from /app so Python can find the backend package
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
