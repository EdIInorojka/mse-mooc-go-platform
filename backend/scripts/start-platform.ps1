param(
    [string]$AllowedOrigins = "http://localhost:5173,https://frontend-ediinorojkas-projects.vercel.app",
    [string]$ResetDemoData = "true",
    [string]$Subdomain = "silly-eggs-bathe"
)

$ErrorActionPreference = "Stop"

$backendRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$logDir = Join-Path $backendRoot ".run-logs"
$pidDir = Join-Path $backendRoot ".run-pids"
New-Item -ItemType Directory -Force $logDir | Out-Null
New-Item -ItemType Directory -Force $pidDir | Out-Null

& (Join-Path $PSScriptRoot "start-local-backend.ps1") -AllowedOrigins $AllowedOrigins -ResetDemoData $ResetDemoData

if (-not (Get-Command npx -ErrorAction SilentlyContinue)) {
    throw "npx is not installed. Install Node.js first."
}

$ltCommand = "cd /d `"$backendRoot`" && npx --yes localtunnel --port 8080 --subdomain $Subdomain 1>> `"$logDir\localtunnel.out.log`" 2>> `"$logDir\localtunnel.err.log`""
$ltProcess = Start-Process -FilePath "cmd.exe" -ArgumentList @("/c", $ltCommand) -WindowStyle Hidden -PassThru
Set-Content -Path (Join-Path $pidDir "localtunnel.pid") -Value $ltProcess.Id

$publicUrl = "https://$Subdomain.loca.lt/healthz"
$ok = $false
for ($i = 0; $i -lt 25; $i++) {
    try {
        $response = Invoke-RestMethod -Uri $publicUrl -Method Get -TimeoutSec 5
        if ($response.status -eq "ok") {
            $ok = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ok) {
    throw "Backend started, but localtunnel health check failed at $publicUrl"
}

Write-Host "Platform is up."
Write-Host "Frontend URL: https://frontend-ediinorojkas-projects.vercel.app"
Write-Host "Backend health: http://localhost:8080/healthz"
Write-Host "Public API health: $publicUrl"
