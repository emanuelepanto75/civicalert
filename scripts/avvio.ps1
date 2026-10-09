# Avvio automatico di CivicAlerts dopo l'accesso a Windows (es. dopo un blackout).
# Avvia Docker Desktop se non è già partito, aspetta che sia pronto, poi l'app.
# Registro: .\backup\avvio.log
# Uso manuale (PowerShell, dalla cartella del progetto):   .\scripts\avvio.ps1
# Con -Blocca lo schermo viene bloccato a fine avvio (utile con l'accesso automatico):
# l'app continua a funzionare anche a schermo bloccato.
param([int]$AttesaMinuti = 10, [switch]$Blocca)

Set-Location (Split-Path $PSScriptRoot -Parent)
New-Item -ItemType Directory -Force -Path backup | Out-Null
$registro = Join-Path (Get-Location) 'backup\avvio.log'
function Scrivi($testo) {
  $riga = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $testo"
  Write-Host $riga
  Add-Content -Path $registro -Value $riga
}

Scrivi 'Avvio CivicAlerts'
$docker = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
if (-not (Get-Process 'Docker Desktop' -ErrorAction SilentlyContinue) -and (Test-Path $docker)) {
  Scrivi 'Avvio Docker Desktop'
  Start-Process $docker
}

$scadenza = (Get-Date).AddMinutes($AttesaMinuti)
do {
  docker info *> $null
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 10
} while ((Get-Date) -lt $scadenza)
if ($LASTEXITCODE -ne 0) {
  Scrivi "Docker non è pronto dopo $AttesaMinuti minuti: avvio non riuscito"
  exit 1
}

Scrivi 'Docker pronto, avvio dei servizi'
docker compose up -d 2>&1 | ForEach-Object { Scrivi $_ }
if ($LASTEXITCODE -ne 0) { Scrivi 'docker compose up non riuscito'; exit 1 }
Scrivi 'CivicAlerts avviato'
if ($Blocca) { rundll32.exe user32.dll,LockWorkStation }
