# TicketChecker

Aplicación web y móvil responsiva para la validación de boletos mediante escaneo de códigos QR. El sistema consta de un backend en .NET para la lógica de negocio y autenticación, y un frontend en React (Vite) para la interfaz de escaneo.

## Características Principales

*   **Validación de QR:** Escaneo rápido y eficiente utilizando `html5-qrcode` con controles manuales para optimizar la batería del dispositivo móvil.
*   **Gestión de Estados:** Manejo visual claro para boletos VÁLIDOS (Verde), INVÁLIDOS (Rojo), y DUPLICADOS (Naranja).
*   **Modo Offline:** Capacidad inicial (stubbed) para guardar validaciones de boletos localmente cuando no hay conexión a internet y sincronizarlos posteriormente.
*   **Autenticación:** Integración preparada para validación LDAP/Active Directory de usuarios administradores y validadores.
*   **Arquitectura Desacoplada:** Frontend SPA moderno servido de manera estática y respaldado por una API REST en .NET 10.

## Tecnologías Utilizadas

*   **Frontend:** React 19, Vite, Material UI (MUI), `html5-qrcode`.
*   **Backend:** ASP.NET Core 10, C# 13, Web API.
*   **Seguridad:** CORS configurado para desarrollo, soporte JWT planeado, autenticación Active Directory/LDAP (stubbed).

## Requisitos Previos

*   [Node.js](https://nodejs.org/) (v18+ recomendado)
*   [.NET SDK 10.0](https://dotnet.microsoft.com/)
*   Navegador con soporte para HTML5 y APIs de Cámara.

## Instrucciones de Configuración y Ejecución

El proyecto está dividido en dos partes principales: el `Backend` y el `Frontend`.

### 1. Ejecutar el Backend

1.  Navega a la carpeta del backend:
    ```bash
    cd Backend
    ```
2.  Restaura los paquetes y ejecuta la aplicación:
    ```bash
    dotnet run
    ```
    *El servidor estará escuchando típicamente en `http://localhost:5106` (o el puerto configurado en `launchSettings.json`).*

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
    *Vite está configurado con un proxy en `vite.config.js` para redirigir automáticamente todas las llamadas `/api` hacia `http://localhost:5106`.*

### 3. Publicación para Producción

Se incluye un script de PowerShell `publish.ps1` en la raíz del proyecto para automatizar el empaquetado del frontend y backend en un único directorio `publish`.

```powershell
./publish.ps1
```
Este script:
1. Compila el Frontend (`npm run build`).
2. Mueve los assets estáticos a la carpeta `wwwroot` del Backend.
3. Publica el Backend como un archivo independiente (Self-Contained) para Windows x64.

## Desarrollo y Contribución

*   **Configuración Local (User Secrets):** Al implementar bases de datos o servicios de correo, se recomienda usar los `User Secrets` de .NET en entorno de desarrollo para evitar subir credenciales a control de versiones.
*   **LDAP:** El `AuthController` tiene la estructura lista para conectarse al servidor LDAP corporativo. Actualmente se utiliza un bypass para el usuario `admin` / `admin` para agilizar pruebas.

---
*Documentación actualizada - Agosto 2026*
