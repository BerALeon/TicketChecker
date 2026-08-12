$AppName = "TicketChecker"
$TargetDir = "C:\TicketChecker"
$ErrorActionPreference = "Stop"

try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue } catch {}
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Debes ejecutar este script como Administrador. Relanzando..."
    Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File "$PSCommandPath"" -Verb RunAs
    exit
}

$ReleaseDir = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$SourceAppPath = Join-Path $ReleaseDir "App"
$LogDir = Join-Path $ReleaseDir "Logs"

Function Write-Log ($Message, $Color="White") {
    Write-Host $Message -ForegroundColor $Color
    "$(Get-Date -f 'yyyy-MM-dd HH:mm:ss') - $Message" | Out-File (Join-Path $LogDir "Deploy_Log.txt") -Append
}

Write-Log "=== Iniciando Despliegue de $AppName ===" "Cyan"

Write-Log "Deteniendo proceso $AppName si esta en ejecucion..."
Stop-Process -Name "Backend" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Log "Copiando archivos a $TargetDir..."
if (-not (Test-Path $TargetDir)) { New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null }
Copy-Item -Path "$SourceAppPath\*" -Destination $TargetDir -Recurse -Force

Write-Log "Creando acceso directo..."
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$env:Public\Desktop\$AppName.lnk")
$Shortcut.TargetPath = "$TargetDir\Backend.exe"
$Shortcut.WorkingDirectory = $TargetDir
$Shortcut.Save()

Write-Log "Iniciando $AppName..."
Start-Process -FilePath "$TargetDir\Backend.exe" -WorkingDirectory $TargetDir -WindowStyle Hidden

Write-Log "=== Despliegue finalizado exitosamente ===" "Green"
Start-Sleep -Seconds 3
