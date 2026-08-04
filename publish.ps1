Write-Host "Construyendo Frontend (React)..." -ForegroundColor Cyan
cd Frontend
npm run build
cd ..

Write-Host "Publicando Backend (.NET) como Self-Contained para Windows x64..." -ForegroundColor Cyan
cd Backend
dotnet publish -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true -o ../publish
cd ..

Write-Host "Publicación completada en la carpeta /publish" -ForegroundColor Green
