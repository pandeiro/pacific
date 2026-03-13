FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements from API (shared dependencies)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy scraper code
COPY . .

# Default command - can be overridden for specific scrapers
CMD ["python", "-c", "print('Scraper service ready. Run specific scrapers manually or via scheduler.')"]