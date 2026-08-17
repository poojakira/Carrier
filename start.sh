#!/bin/bash
set -e
echo '🚀 Starting Careerly OS...'

# Check if .env exists, if not copy from example and generate secrets
if [ ! -f .env ]; then
  cp .env.example .env
  AUTH_SECRET=$(openssl rand -hex 32)
  APP_KEY=$(openssl rand -base64 32)
  sed -i "s/replace-with-a-64-character-random-secret/$AUTH_SECRET/" .env
  sed -i "s|replace-with-a-32-byte-base64-or-hex-key|$APP_KEY|" .env
  echo '✅ Generated .env with secrets'
fi

# Start Postgres + App with docker compose
docker compose up -d db
echo '⏳ Waiting for Postgres...'
sleep 5

# Install deps and push schema
npm install
npx prisma db push

# Start dev server
echo '✅ Careerly OS is starting at http://localhost:3000'
npm run dev
