$ErrorActionPreference = "Stop"
$BaseDir = "c:\Users\Rentas 15195\Documents\Proyectos\TicketChecker"
$DeployTemp = Join-Path $BaseDir "deploy_temp"
$DesktopReleaseDir = "C:\Users\Rentas 15195\Desktop\release"

# Crear estructura
Write-Host "Creando directorios..."
New-Item -ItemType Directory -Force -Path "$DeployTemp\App" | Out-Null
New-Item -ItemType Directory -Force -Path "$DeployTemp\Logs" | Out-Null
New-Item -ItemType Directory -Force -Path "$DeployTemp\SPs\SP1" | Out-Null
if (-not (Test-Path $DesktopReleaseDir)) {
    New-Item -ItemType Directory -Force -Path $DesktopReleaseDir | Out-Null
}

# Copiar App
Write-Host "Copiando binarios..."
Copy-Item -Path "$BaseDir\publish\*" -Destination "$DeployTemp\App" -Recurse -Force

# Crear script PS1
Write-Host "Creando Deploy-Server.ps1..."
$ps1Content = @"
`$AppName = "TicketChecker"
`$TargetDir = "C:\TicketChecker"
`$ErrorActionPreference = "Stop"

try { Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force -ErrorAction SilentlyContinue } catch {}
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Debes ejecutar este script como Administrador. Relanzando..."
    Start-Process PowerShell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"`$PSCommandPath`"" -Verb RunAs
    exit
}

`$ReleaseDir = (Resolve-Path (Join-Path `$PSScriptRoot "..\..")).Path
`$SourceAppPath = Join-Path `$ReleaseDir "App"
`$LogDir = Join-Path `$ReleaseDir "Logs"

Function Write-Log (`$Message, `$Color="White") {
    Write-Host `$Message -ForegroundColor `$Color
    "`$(Get-Date -f 'yyyy-MM-dd HH:mm:ss') - `$Message" | Out-File (Join-Path `$LogDir "Deploy_Log.txt") -Append
}

Write-Log "=== Iniciando Despliegue de `$AppName ===" "Cyan"

Write-Log "Deteniendo proceso `$AppName si esta en ejecucion..."
Stop-Process -Name "Backend" -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Log "Copiando archivos a `$TargetDir..."
if (-not (Test-Path `$TargetDir)) { New-Item -ItemType Directory -Force -Path `$TargetDir | Out-Null }
Copy-Item -Path "`$SourceAppPath\*" -Destination `$TargetDir -Recurse -Force

Write-Log "Creando acceso directo..."
`$WshShell = New-Object -comObject WScript.Shell
`$Shortcut = `$WshShell.CreateShortcut("`$env:Public\Desktop\`$AppName.lnk")
`$Shortcut.TargetPath = "`$TargetDir\Backend.exe"
`$Shortcut.WorkingDirectory = `$TargetDir
`$Shortcut.Save()

Write-Log "Iniciando `$AppName..."
Start-Process -FilePath "`$TargetDir\Backend.exe" -WorkingDirectory `$TargetDir -WindowStyle Hidden

Write-Log "=== Despliegue finalizado exitosamente ===" "Green"
Start-Sleep -Seconds 3
"@
Set-Content -Path "$DeployTemp\SPs\SP1\Deploy-Server.ps1" -Value $ps1Content -Encoding UTF8

# Crear CMD
Write-Host "Creando Deploy.cmd..."
$cmdContent = @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Deploy-Server.ps1"
pause
"@
Set-Content -Path "$DeployTemp\SPs\SP1\Deploy.cmd" -Value $cmdContent -Encoding ASCII

# Zipear
Write-Host "Empaquetando a ZIP..."
$DateString = Get-Date -Format "yyyyMMdd_HHmm"
$ZipName = "TicketChecker_V1.0.0.0.1_$DateString.zip"
$ZipPath = Join-Path $DesktopReleaseDir $ZipName

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }
Compress-Archive -Path "$DeployTemp\*" -DestinationPath $ZipPath -Force

# Limpieza
Write-Host "Limpiando archivos temporales y publish..."
Remove-Item -Path $DeployTemp -Recurse -Force
if (Test-Path "$BaseDir\publish") {
    Remove-Item -Path "$BaseDir\publish" -Recurse -Force
}

Write-Host "============================================="
Write-Host "EXITO: Release creado en $ZipPath" -ForegroundColor Green
Write-Host "Carpeta publish eliminada."
Write-Host "============================================="
