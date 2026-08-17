Write-Host '🚀 Starting Careerly OS...' -ForegroundColor Green

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  $secret = -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
  $key = [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
  (Get-Content .env) -replace 'replace-with-a-64-character-random-secret', $secret | Set-Content .env
  (Get-Content .env) -replace 'replace-with-a-32-byte-base64-or-hex-key', $key | Set-Content .env
  Write-Host '✅ Generated .env with secrets'
}

docker compose up -d db
Write-Host '⏳ Waiting for Postgres...'
Start-Sleep -Seconds 5

npm install
npx prisma db push

Write-Host '✅ Careerly OS starting at http://localhost:3000' -ForegroundColor Green
npm run dev
