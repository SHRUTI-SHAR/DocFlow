# # Simple Backend Dockerfile for SimplifyInsurance FastAPI
# FROM python:3.11-slim

# # Set working directory
# WORKDIR /app

# # Install system dependencies
# RUN apt-get update && apt-get install -y \
#     gcc \
#     libpq-dev \
#     libgl1 \
#     libglib2.0-0 \
#     && rm -rf /var/lib/apt/lists/*

# # Copy requirements first for better caching
# COPY requirements.txt .

# # Install Python dependencies
# RUN pip install --no-cache-dir -r requirements.txt

# # Copy application code
# COPY . .

# COPY models/ /app/models/

# # Expose port
# EXPOSE 8000

# # Start the application
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]


# SimplifyInsurance Backend Dockerfile (YOLO + FastAPI + PyTorch CPU)
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed for PyTorch, Ultralytics, OpenCV & cryptography
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libpq-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --no-cache-dir --upgrade pip

# Install PyTorch CPU BEFORE ultralytics
RUN pip install --no-cache-dir torch torchvision torchaudio \
    --index-url https://download.pytorch.org/whl/cpu

# Copy requirements first for caching
COPY requirements.txt .

# Install remaining Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source (excluding models via .dockerignore or overwrite below)
COPY . .

# Explicitly copy models directory AFTER COPY . . to ensure they're not overwritten
# Remove any empty models dir that might have been copied, then copy fresh
RUN rm -rf /app/models && mkdir -p /app/models
COPY models/ /app/models/

# Verify models exist at build time
RUN echo "=== Verifying YOLO models at BUILD time ===" && \
    ls -lh /app/models/ && \
    test -f /app/models/signature_detector.pt && echo "✅ signature_detector.pt found" || (echo "❌ signature_detector.pt missing" && exit 1) && \
    test -f /app/models/model.pt && echo "✅ model.pt found" || (echo "❌ model.pt missing" && exit 1)

# Verify models at container START time (debug)
RUN echo '#!/bin/bash\necho "=== Verifying models at RUNTIME ==="\nls -lh /app/models/\nexec uvicorn app.main:app --host 0.0.0.0 --port 8000' > /app/start.sh && chmod +x /app/start.sh

# Expose the FastAPI port
EXPOSE 8000

# Start FastAPI server with model verification
CMD ["/app/start.sh"]
