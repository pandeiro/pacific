#!/bin/bash
set -e

echo "================================"
echo "Pacifica API Container Starting"
echo "================================"

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
until python3 -c "
import psycopg2
import os
database_url = os.getenv('DATABASE_URL', 'postgresql://pacifica:password@postgres:5432/pacifica').replace('postgresql+asyncpg', 'postgresql')
print(f'Testing connection to: {database_url.replace(\"password\", \"****\")}')
try:
    conn = psycopg2.connect(database_url)
    conn.close()
    print('Connection successful!')
    exit(0)
except Exception as e:
    print(f'Connection failed: {e}')
    exit(1)
"; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "PostgreSQL is up!"

# Run migrations and seed
echo ""
echo "Running database setup..."
python3 /app/run_migrations.py

# Start the application
echo ""
echo "Starting API server..."
exec uvicorn main:app --host 0.0.0.0 --port 4900