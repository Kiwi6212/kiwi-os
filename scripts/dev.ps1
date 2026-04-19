# Script helper pour démarrer l'environnement de dev
Write-Host "Starting Kiwi OS dev environment..." -ForegroundColor Green
docker compose up -d
Write-Host "Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
docker compose ps
