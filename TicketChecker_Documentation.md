# Proyecto: TicketChecker
**Versión Actual:** 1.0.0.0.14  
**Fecha de Elaboración:** 18 de Agosto de 2026  

## 1. Descripción del Proyecto
**TicketChecker** es una solución web-mobile y de servidor (Backend) diseñada para la validación y escaneo de boletos de acceso en complejos cinematográficos (Cinemex). El sistema reemplaza la necesidad de hardware especializado costoso al permitir que el personal utilice la cámara de cualquier dispositivo inteligente (tableta o celular) a través de un navegador web para validar códigos de barras/QR directamente contra el Punto de Venta local de AdmitOne (Sales Portal).

El proyecto consta de dos piezas fundamentales:
1. **Frontend:** Una WebApp responsiva que utiliza la cámara del dispositivo para leer boletos.
2. **Backend:** Un middleware ligero instalado en cada servidor de complejo que se comunica internamente con el POS de AdmitOne para comprobar la validez de cada código en tiempo real.

---

## 2. Stack Tecnológico

### Frontend (Interfaz de Usuario)
- **Framework:** React.js (Vite)
- **Lenguaje:** JavaScript / JSX
- **Librería UI:** Material-UI (MUI) para componentes, alertas y diseño responsivo.
- **Librerías Clave:** 
  - `html5-qrcode`: Para lectura de códigos QR y de barras vía cámara HTML5 nativa.
  - `react-router-dom`: Para navegación entre pantallas (Setup, Scanner, Historial).

### Backend (Lógica y Conectividad)
- **Framework:** .NET 10.0 (ASP.NET Core Minimal APIs / Web API)
- **Lenguaje:** C#
- **Despliegue:** Self-Contained Windows Service (No requiere instalación de SDKs en el servidor anfitrión).
- **Formatos Soportados:** XML (Interacción estricta con el Sales Portal de AdmitOne).

### Automatización y Despliegue
- **Scripting:** PowerShell 5+ (`build_release.ps1`, `Deploy-Server.ps1`)
- **Gestor de Servicios:** Windows Service Control Manager (`sc.exe`)

---

## 3. Arquitectura y Reglas de Negocio

### 3.1 Topología
La solución opera dentro de la intranet (red local) de cada complejo:
- El **Backend** se instala en un servidor Windows del cine y levanta un servicio en el puerto `5000`.
- El **Frontend** es servido estáticamente por ese mismo Backend.
- Los **celulares/tabletas** se conectan por Wi-Fi al servidor ingresando a la URL local (Ej: `http://10.55.55.78:5000`).
- El **Backend** actúa como proxy/adaptador comunicándose con la IP del servidor AdmitOne local en su puerto nativo (usualmente `8001`).

### 3.2 Lógica de Lectura
### 3.2 Lógica de Lectura
El sistema es capaz de entender dos formatos principales de códigos de AdmitOne:

1. **Order Level Barcodes (`9O`):** Códigos que representan órdenes de compra enteras. Pueden tener 12 caracteres (formato V1) o 14 caracteres terminados en `XX` (formato V2). El Backend extrae y sanitiza el número real, rellenándolo de ceros a 10 dígitos.
2. **Ticket Level Barcodes (`9G`):** Códigos que representan asientos individuales (ID Función + ID Asiento). El Backend no extrae porciones de este código, sino que envía el código de barras completo para consultar el estado del boleto individual.

### 3.3 Reglas de Validación (Integración AdmitOne)
El Backend soporta dos flujos de validación (rutas) dependiendo del tipo de código:

**A. Flujo de Órdenes (Prefijo `9O` - 3 Pasos):**
1. **Query (543):** Obtiene un identificador de sesión (`handle`) usando el `OrderId` del ticket.
2. **GetBlock (543):** Usa el `handle` para consultar la orden detallada extrayendo película, horario y asientos.
3. **Close (530):** Cierra el `handle` liberando la memoria del POS.

**B. Flujo de Boletos Individuales (Prefijo `9G` - 1 Paso):**
1. **Validation (570):** Envía el código completo. El POS devuelve los detalles completos (película, horario, asientos, validación) en una sola respuesta.
2. **Interpretación:** El sistema evalúa el nodo `<resultDetails>` (traduciendo errores del inglés al español) y la etiqueta `<perfTime>` para realizar una validación local estricta de tiempo de ingreso, ignorando las reglas de tiempo del POS y aplicando las locales (máx 20 minutos antes, máx 50 minutos después).
3. **Estatus Temprano (`EARLY`):** Si un boleto es escaneado antes del tiempo permitido (para ambos flujos 9G y 9O), el sistema alerta con el estado `EARLY` de forma estandarizada en la interfaz (Alerta Amarilla de MUY TEMPRANO).

### 3.4 Manejo de Duplicados e Historial (Auditoría)
1. **Capa Servidor (AdmitOne):** Si la respuesta del POS indica rechazo, se mapea el error, **excepto** cuando devuelve "Already Validated" en códigos 9G. En ese caso, la aplicación perdona el rechazo del servidor y asume que es la primera vez que el cliente ingresa, difiriendo la decisión final a la capa local (Capa Anti-Spam).
2. **Capa Local (Anti-Spam / Única Fuente de Verdad):** El Backend guarda un registro en memoria de los boletos que *ya pasaron exitosamente* en esa sesión. Si el mismo dispositivo escanea el boleto de nuevo, el Backend arroja Alerta Amarilla de Duplicado (`DUPLICATE`) inmediatamente. Ésta es la validación definitiva de duplicidad.
3. **Bitácora de Auditoría (JSON):** Todos los intentos de escaneo (Válidos, Inválidos, Duplicados, Tempranos, Errores) se registran en un archivo JSON diario dentro de la carpeta `Logs/Historico`. Sin embargo, la interfaz de "Historial" en el escáner del usuario filtra esta información para mostrar *únicamente* los boletos válidos del día. Los errores del sistema en general se envían al Visor de Eventos de Windows.

### 3.5 Seguridad en Configuración
Para evitar alteraciones accidentales o maliciosas por parte del personal operativo, la pantalla de Configuración (`/setup`) cuenta con:
- **Protección por Contraseña:** El acceso desde el menú del escáner requiere la contraseña de administrador (`Cinemex2026`).
- **Ofuscación de Pistas:** Los campos de texto muestran placeholders genéricos ("Ingrese IP", "Ingrese Pto.") en lugar de ejemplos de formatos válidos.
- **Validación de Cambios:** El botón de "Guardar" permanece deshabilitado a menos que el sistema detecte un cambio real en los valores pre-cargados.

---

## 4. Estrategia de Despliegue (Instalación)

El paquete generado (`TicketChecker_V1.0.0.0.X.zip`) fue diseñado para permitir una instalación **"One-Click"** pensada para soporte IT nivel 1 o 2 conectados por RDP (Escritorio Remoto).

### Flujo de Instalación por Complejo
1. IT descomprime el ZIP en el servidor y ejecuta `Deploy.cmd` como Administrador. *(Nota: El script de empaquetado excluye automáticamente la carpeta de Logs para que cada instalación en servidor nuevo arranque con un historial limpio).*
2. El script detiene versiones previas, copia el software a `C:\Apps\TicketChecker` y registra la aplicación nativamente como un **Servicio de Windows**.
3. El servicio inicia en segundo plano y el script abre el navegador.
4. IT introduce la IP de la terminal local de AdmitOne (Setup) en la pantalla de bienvenida, y queda configurado.
5. El Backend purga automáticamente logs viejos (>7 días) para no saturar el disco duro del servidor con el paso de los meses.

---

## 5. Requerimientos de Infraestructura
- **Sistema Operativo Servidor:** Windows Server 2016, 2019, 2022 o Windows 10/11 Pro.
- **CPU/RAM:** Mínimos (< 50MB RAM en ejecución, carga de CPU marginal).
- **Puertos de Red:**
  - El servidor debe permitir conexiones entrantes en el puerto `5000` (El instalador puede requerir `New-NetFirewallRule`).
- **Dispositivos Móviles (Escáneres):**
  - Conexión a la red Wi-Fi local que tenga visibilidad al Servidor.
  - Navegador moderno (Chrome, Safari). 
  - *Nota:* Políticas estrictas de Chrome exigen HTTPS para activar la cámara o bien añadir la IP del servidor local en las banderas de Chrome (`chrome://flags/#unsafely-treat-insecure-origin-as-secure`).
