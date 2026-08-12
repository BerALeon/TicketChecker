# TicketChecker

AplicaciÃ³n web y mÃ³vil responsiva para la validaciÃ³n de boletos mediante escaneo de cÃ³digos QR. El sistema consta de un backend en .NET para la lÃ³gica de negocio y autenticaciÃ³n, y un frontend en React (Vite) para la interfaz de escaneo.

## CaracterÃ­sticas Principales

*   **ValidaciÃ³n de QR:** Escaneo rÃ¡pido y eficiente utilizando `html5-qrcode` con controles manuales para optimizar la baterÃ­a del dispositivo mÃ³vil.
*   **GestiÃ³n de Estados:** Manejo visual claro para boletos VÃLIDOS (Verde), INVÃLIDOS (Rojo), y DUPLICADOS (Naranja).
*   **Modo Offline:** Capacidad inicial (stubbed) para guardar validaciones de boletos localmente cuando no hay conexiÃ³n a internet y sincronizarlos posteriormente.
*   **AutenticaciÃ³n:** IntegraciÃ³n preparada para validaciÃ³n LDAP/Active Directory de usuarios administradores y validadores.
*   **Arquitectura Desacoplada:** Frontend SPA moderno servido de manera estÃ¡tica y respaldado por una API REST en .NET 10.

## TecnologÃ­as Utilizadas

*   **Frontend:** React 19, Vite, Material UI (MUI), `html5-qrcode`.
*   **Backend:** ASP.NET Core 10, C# 13, Web API.
*   **Seguridad:** CORS configurado para desarrollo, soporte JWT planeado, autenticaciÃ³n Active Directory/LDAP (stubbed).

## Requisitos Previos

*   [Node.js](https://nodejs.org/) (v18+ recomendado)
*   [.NET SDK 10.0](https://dotnet.microsoft.com/)
*   Navegador con soporte para HTML5 y APIs de CÃ¡mara.

## Instrucciones de ConfiguraciÃ³n y EjecuciÃ³n

El proyecto estÃ¡ dividido en dos partes principales: el `Backend` y el `Frontend`.

### 1. Ejecutar el Backend

1.  Navega a la carpeta del backend:
    ```bash
    cd Backend
    ```
2.  Restaura los paquetes y ejecuta la aplicaciÃ³n:
    ```bash
    dotnet run
    ```
    *El servidor estarÃ¡ escuchando tÃ­picamente en `http://localhost:5106` (o el puerto configurado en `launchSettings.json`).*

### 2. Ejecutar el Frontend (Modo Desarrollo)

1.  Abre una nueva terminal y navega a la carpeta del frontend:
    ```bash
    cd Frontend
    ```
2.  Instala las dependencias (solo la primera vez):
    ```bash
    npm install
    ```
3.  Inicia el servidor de desarrollo de Vite:
    ```bash
    npm run dev
    ```
    *Vite estÃ¡ configurado con un proxy en `vite.config.js` para redirigir automÃ¡ticamente todas las llamadas `/api` hacia `http://localhost:5106`.*

### 3. PublicaciÃ³n para ProducciÃ³n

Se incluye un script de PowerShell `publish.ps1` en la raÃ­z del proyecto para automatizar el empaquetado del frontend y backend en un Ãºnico directorio `publish`.

```powershell
./publish.ps1
```
Este script:
1. Compila el Frontend (`npm run build`).
2. Mueve los assets estÃ¡ticos a la carpeta `wwwroot` del Backend.
3. Publica el Backend como un archivo independiente (Self-Contained) para Windows x64.

## Desarrollo y ContribuciÃ³n

*   **ConfiguraciÃ³n Local (User Secrets):** Al implementar bases de datos o servicios de correo, se recomienda usar los `User Secrets` de .NET en entorno de desarrollo para evitar subir credenciales a control de versiones.
*   **LDAP:** El `AuthController` tiene la estructura lista para conectarse al servidor LDAP corporativo. Actualmente se utiliza un bypass para el usuario `admin` / `admin` para agilizar pruebas.

---
*DocumentaciÃ³n actualizada - Agosto 2026*
