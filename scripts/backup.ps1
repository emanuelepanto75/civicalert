# Backup di CivicAlerts: database + foto/video, in .\backup\AAAA-MM-GG_HHmm
# Uso (PowerShell, dalla cartella del progetto):   .\scripts\backup.ps1
# I backup più vecchi di $Giorni giorni vengono eliminati.
param([int]$Giorni = 30)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$cartella = Join-Path (Get-Location) ("backup\" + (Get-Date -Format 'yyyy-MM-dd_HHmm'))
New-Item -ItemType Directory -Force -Path $cartella | Out-Null

Write-Host "Backup database..."
docker compose exec -T db pg_dump -U civicalert -Fc -f /tmp/civicalert.dump civicalert
if ($LASTEXITCODE -ne 0) { throw "pg_dump non riuscito" }
docker compose cp db:/tmp/civicalert.dump "$cartella\database.dump"

Write-Host "Backup foto e video..."
docker compose cp app:/data/uploads "$cartella\uploads"

Get-ChildItem backup -Directory |
  Where-Object { $_.CreationTime -lt (Get-Date).AddDays(-$Giorni) } |
  Remove-Item -Recurse -Force

Write-Host "Backup completato in $cartella"
Write-Host "Ricorda di copiarlo anche FUORI dal server (disco esterno o cloud)."
