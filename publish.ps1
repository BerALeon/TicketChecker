Write-Host "Construyendo Frontend (React)..." -ForegroundColor Cyan
Set-Location Frontend
npm run build
Set-Location ..

Write-Host "Publicando Backend (.NET) como Self-Contained para Windows x64..." -ForegroundColor Cyan
Set-Location Backend
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true -o ../publish
Set-Location ..

Write-Host "Publicación completada en la carpeta /publish" -ForegroundColor Green
