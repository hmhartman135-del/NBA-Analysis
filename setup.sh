#!/usr/bin/env bash
set -e

echo "==> Setting up NBA Analytics Platform"

# Backend
echo "--- Backend ---"
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created backend/.env — add your ANTHROPIC_API_KEY"
fi

cd ..

# Frontend
echo "--- Frontend ---"
cd frontend
npm install
if [ ! -f .env.local ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
fi
cd ..

echo ""
echo "Setup complete!"
echo ""
echo "Start services:"
echo "  docker compose up -d        # Postgres + Redis"
echo "  cd backend && uvicorn app.main:app --reload"
echo "  cd frontend && npm run dev"
