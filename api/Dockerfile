FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (includes migrations, seed, entrypoint)
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Run migrations and start the application
ENTRYPOINT ["/app/entrypoint.sh"]