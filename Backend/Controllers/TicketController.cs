using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Backend.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.AspNetCore.Hosting;
using System.IO;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _env;

    // Historial de escaneos para la API history/today
    private static readonly ConcurrentDictionary<string, TicketResponse> _scannedTickets = new();
    private static bool _isHistoryLoaded = false;
    private static readonly object _historyLock = new object();

    public TicketController(IHttpClientFactory httpClientFactory, IConfiguration configuration, IWebHostEnvironment env)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _env = env;

        LoadHistoryIfNeeded();
    }

    // -------------------------------------------------------------------------
    // POST api/ticket/validate
    // -------------------------------------------------------------------------
    [HttpPost("validate")]
    public async Task<IActionResult> Validate([FromBody] TicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Folio))
            return BadRequest(new { Message = "Folio inválido." });

        var barcode = request.Folio.Trim();
        var now = DateTime.Now;

        // 1. Extraer el Audit Number del código de barras (soporta v1 y v2)
        var extractionResult = ExtractAuditNumber(barcode);
        if (!extractionResult.Success)
        {
            return Ok(new TicketResponse
            {
                Status = "INVALID",
                Message = extractionResult.ErrorMessage,
                Folio = barcode
            });
        }

        // 1.5 Revisar si ya está en el historial local (fue escaneado en esta sesión)
        if (_scannedTickets.TryGetValue(barcode, out var previousScan))
        {
            return Ok(new TicketResponse
            {
                Status = "DUPLICATE",
                Message = "Esta orden ya fue registrada anteriormente (Historial Local).",
                Folio = barcode,
                Pelicula = previousScan.Pelicula,
                Horario = previousScan.Horario,
                Asientos = previousScan.Asientos,
                ScannedAt = previousScan.ScannedAt
            });
        }

        // 2. Consultar el Sales Portal real
        XDocument portalXml;
        try
        {
            portalXml = await QueryOrderDetailsAsync(extractionResult.AuditNumber);
        }
        catch (HttpRequestException ex)
        {
            return StatusCode(503, new { Message = $"Error de conexión con el Sales Portal: {ex.Message}" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { Message = $"Error inesperado al consultar el portal: {ex.Message}" });
        }

        // 3. Interpretar la respuesta XML
        // El portal devuelve el nodo raíz como "admitOne" (case-sensitive)
        var admitoneNode = portalXml.Element("admitOne");
        if (admitoneNode == null)
            return StatusCode(502, new { Message = "Respuesta XML del portal con formato inesperado." });

        string resultCode = admitoneNode.Attribute("result")?.Value ?? "-1";
        TicketResponse finalResponse;

        if (resultCode == "0") // 0 = Éxito
        {
            var ordersNode = admitoneNode.Element("orders");
            var orderNode = ordersNode?.Element("order");

            if (orderNode == null)
            {
                // Si la respuesta fue exitosa pero no trajo una orden, significa que no encontró el folio.
                finalResponse = new TicketResponse
                {
                    Status  = "INVALID",
                    Message = $"Orden con folio '{barcode}' no encontrada en el sistema.",
                    Folio   = barcode
                };
                return Ok(finalResponse);
            }

            string collected = orderNode.Element("collected")?.Value;
            
            // Intentar extraer el nombre de la película, horario y asientos desde orderItems -> orderItem
            string pelicula = string.Empty;
            string horario = string.Empty;
            List<string> asientosList = new();

            var firstOrderItem = orderNode.Element("orderItems")?.Elements("orderItem").FirstOrDefault();
            if (firstOrderItem != null)
            {
                pelicula = firstOrderItem.Element("eventName")?.Value ?? string.Empty;

                var timeNode = firstOrderItem.Element("time");
                if (timeNode != null && timeNode.Value.Length >= 14)
                {
                    var t = timeNode.Value; // e.g. 20260811201000
                    horario = $"{t.Substring(6, 2)}/{t.Substring(4, 2)}/{t.Substring(0, 4)} {t.Substring(8, 2)}:{t.Substring(10, 2)}";
                }

                var seatsNode = firstOrderItem.Element("seats")?.Element("allocated");
                if (seatsNode != null && !string.IsNullOrEmpty(seatsNode.Value))
                {
                    var seatParts = seatsNode.Value.Split('/');
                    foreach (var part in seatParts)
                    {
                        var chunks = part.Split(':');
                        if (chunks.Length >= 3)
                        {
                            asientosList.Add($"{chunks[2]}-{chunks[1]}");
                        }
                    }
                }
            }

            if (asientosList.Count == 0)
                asientosList.Add("N/A");

            // Regla de Negocio: Si <collected> es igual a "1", lo tomamos como DUPLICADO (ya fue usado).
            // Actualmente es de Solo Lectura.
            if (collected == "1")
            {
                finalResponse = new TicketResponse
                {
                    Status   = "DUPLICATE",
                    Message  = "Esta orden ya fue registrada anteriormente.",
                    Folio    = barcode,
                    Pelicula = pelicula,
                    Horario  = horario,
                    Asientos = asientosList
                };
            }
            else
            {
                // Boleto válido
                finalResponse = new TicketResponse
                {
                    Status     = "VALID",
                    Message    = "La orden es válida y ha sido registrada.",
                    Folio      = barcode,
                    Pelicula   = pelicula,
                    Horario    = horario,
                    Asientos   = asientosList,
                    ScannedAt  = now
                };

                // Guardar en el historial de escaneos exitosos del día
                _scannedTickets.TryAdd(barcode, finalResponse);
                
                // Guardar asíncronamente en el archivo JSON
                _ = SaveHistoryAsync();
            }
        }
        else if (resultCode == "3") // Terminal no autorizada
        {
            finalResponse = new TicketResponse
            {
                Status  = "INVALID",
                Message = "El portal rechazó la solicitud. Verifica que la terminal esté autorizada para consultar órdenes (cód. 3).",
                Folio   = barcode
            };
        }
        else
        {
            finalResponse = new TicketResponse
            {
                Status  = "INVALID",
                Message = $"El portal devolvió un error (código: {resultCode}).",
                Folio   = barcode
            };
        }

        return Ok(finalResponse);
    }

    // -------------------------------------------------------------------------
    // GET api/ticket/history/today
    // -------------------------------------------------------------------------
    [HttpGet("history/today")]
    public IActionResult GetTodayHistory()
    {
        var today = DateTime.Today;
        var history = _scannedTickets.Values
            .Where(t => t.Status == "VALID" && t.ScannedAt.HasValue && t.ScannedAt.Value.Date == today)
            .OrderByDescending(t => t.ScannedAt)
            .ToList();

        return Ok(history);
    }

    // =========================================================================
    // Métodos privados de ayuda
    // =========================================================================

    /// <summary>
    /// Envía una solicitud XML al Sales Portal y devuelve la respuesta parseada.
    /// </summary>
    private async Task<XDocument> SendAdmitOneRequestAsync(string xmlBody)
    {
        var client = _httpClientFactory.CreateClient();
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "XML", xmlBody }  // El parámetro DEBE llamarse "XML" según documentación
        });

        if (_configuration is IConfigurationRoot configRoot)
        {
            configRoot.Reload();
        }

        var salesPortalUrl = _configuration["SalesPortal:Url"] ?? string.Empty;
        var httpResponse = await client.PostAsync(salesPortalUrl, content);
        httpResponse.EnsureSuccessStatusCode();

        string xmlResponse = await httpResponse.Content.ReadAsStringAsync();

        // ------------------ DEBUG LOG XML ------------------
        try
        {
            var debugDir = Path.Combine(_env.ContentRootPath, "Logs", "Debug");
            if (!Directory.Exists(debugDir)) Directory.CreateDirectory(debugDir);
            var debugFile = Path.Combine(debugDir, $"xml_log_{DateTime.Now:yyyyMMdd}.txt");
            var logEntry = $"\n=== {DateTime.Now:HH:mm:ss} ===\nREQUEST:\n{xmlBody}\n\nRESPONSE:\n{xmlResponse}\n==================\n";
            await System.IO.File.AppendAllTextAsync(debugFile, logEntry);
        }
        catch { /* Ignorar errores de debug */ }
        // ---------------------------------------------------

        return XDocument.Parse(xmlResponse);
    }

    /// <summary>
    /// Ejecuta el flujo de 3 pasos (query -> getBlock -> closeQuery) para obtener los detalles de la orden.
    /// </summary>
    private async Task<XDocument> QueryOrderDetailsAsync(string orderId)
    {
        if (_configuration is IConfigurationRoot configRoot)
        {
            configRoot.Reload();
        }

        var terminalId = _configuration["SalesPortal:TerminalId"] ?? string.Empty;

        // Paso 1: Consultar para obtener el handle
        string step1Xml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"543\" terminal=\"{terminalId}\"><action>query</action><searchReason>2</searchReason><newestFirst>1</newestFirst><audit>{orderId}</audit></admitOne>";
        XDocument step1Response = await SendAdmitOneRequestAsync(step1Xml);

        var admitOne1 = step1Response.Element("admitOne");
        if (admitOne1 == null || admitOne1.Attribute("result")?.Value != "0")
            return step1Response; // Retorna el error para que el controlador lo procese

        string handle = admitOne1.Element("handle")?.Value;
        if (string.IsNullOrEmpty(handle))
            return step1Response; 

        XDocument step2Response = null;
        try
        {
            // Paso 2: Extraer el bloque usando el handle
            string step2Xml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"543\" terminal=\"{terminalId}\"><handle>{handle}</handle><action>getBlock</action><newestFirst>1</newestFirst></admitOne>";
            step2Response = await SendAdmitOneRequestAsync(step2Xml);
            return step2Response;
        }
        finally
        {
            // Paso 3: Cerrar sesión/handle (Se ejecuta siempre para no dejar handles abiertos en el portal)
            try
            {
                string step3Xml = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"530\" terminal=\"{terminalId}\"><handle>{handle}</handle></admitOne>";
                await SendAdmitOneRequestAsync(step3Xml);
            }
            catch
            {
                // Ignorar errores al cerrar el handle de forma deliberada
            }
        }
    }

    /// <summary>
    /// Extrae el Audit Number del código de barras.
    /// Soporta formato v1 (12 chars: 9O + 10 dígitos) y v2 (14 chars: 9O + 10 alfanum + XX).
    /// </summary>
    private static ExtractionResult ExtractAuditNumber(string barcode)
    {
        if (!barcode.StartsWith("9O"))
            return new ExtractionResult { Success = false, ErrorMessage = "El código debe iniciar con '9O'." };

        if (barcode.Length == 12)
        {
            // Formato v1: 9O + 10 dígitos numéricos
            string auditPart = barcode.Substring(2, 10);
            if (auditPart.All(char.IsDigit))
                return new ExtractionResult { Success = true, AuditNumber = auditPart };

            return new ExtractionResult { Success = false, ErrorMessage = "Formato v1 inválido: Debe contener 10 dígitos numéricos." };
        }

        if (barcode.Length == 14)
        {
            // Formato v2: 9O + 10 alfanum + XX
            if (!barcode.EndsWith("XX"))
                return new ExtractionResult { Success = false, ErrorMessage = "Formato v2 inválido: Debe terminar en 'XX'." };

            string auditPart = barcode.Substring(2, 10);
            string numericAudit = new string(auditPart.Where(char.IsDigit).ToArray());

            if (string.IsNullOrEmpty(numericAudit))
                return new ExtractionResult { Success = false, ErrorMessage = "Formato v2 inválido: No se encontraron números en la referencia." };

            // Rellenar con ceros a la izquierda hasta 10 dígitos
            numericAudit = numericAudit.PadLeft(10, '0');
            return new ExtractionResult { Success = true, AuditNumber = numericAudit };
        }

        return new ExtractionResult { Success = false, ErrorMessage = "Longitud de código inválida. Se esperaban 12 o 14 caracteres." };
    }

    private void LoadHistoryIfNeeded()
    {
        if (_isHistoryLoaded) return;

        lock (_historyLock)
        {
            if (_isHistoryLoaded) return;

            try
            {
                var directory = Path.Combine(_env.ContentRootPath, "Logs", "Historico");
                if (!Directory.Exists(directory)) return;

                // 1. Limpiar archivos viejos (mayores a 7 días)
                CleanupOldHistoryFiles(directory);

                // 2. Cargar el historial de hoy
                var fileName = $"historial_{DateTime.Today:yyyy-MM-dd}.json";
                var filePath = Path.Combine(directory, fileName);

                if (System.IO.File.Exists(filePath))
                {
                    var json = System.IO.File.ReadAllText(filePath);
                    var loadedDict = JsonSerializer.Deserialize<Dictionary<string, TicketResponse>>(json);
                    
                    if (loadedDict != null)
                    {
                        foreach (var kvp in loadedDict)
                        {
                            _scannedTickets.TryAdd(kvp.Key, kvp.Value);
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Ignorar errores al cargar el historial para no afectar el arranque
            }
            finally
            {
                _isHistoryLoaded = true;
            }
        }
    }

    private async Task SaveHistoryAsync()
    {
        try
        {
            var directory = Path.Combine(_env.ContentRootPath, "Logs", "Historico");
            if (!Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }

            var fileName = $"historial_{DateTime.Today:yyyy-MM-dd}.json";
            var filePath = Path.Combine(directory, fileName);

            var options = new JsonSerializerOptions { WriteIndented = true };
            // Copiar el diccionario para evitar bloqueos
            var snapshot = _scannedTickets.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
            var json = JsonSerializer.Serialize(snapshot, options);

            await System.IO.File.WriteAllTextAsync(filePath, json);
        }
        catch (Exception)
        {
            // Fallo silencioso si no se puede escribir el log
        }
    }

    private void CleanupOldHistoryFiles(string directory)
    {
        try
        {
            var files = Directory.GetFiles(directory, "historial_*.json");
            var thresholdDate = DateTime.Now.AddDays(-7);

            foreach (var file in files)
            {
                var fileInfo = new FileInfo(file);
                if (fileInfo.CreationTime < thresholdDate && fileInfo.LastWriteTime < thresholdDate)
                {
                    fileInfo.Delete();
                }
            }
        }
        catch (Exception)
        {
            // Ignorar errores al limpiar archivos viejos
        }
    }
}

// =============================================================================
// Clases auxiliares internas del controlador
// =============================================================================

public class ExtractionResult
{
    public bool   Success      { get; set; }
    public string AuditNumber  { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}
