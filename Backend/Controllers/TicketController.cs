using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Backend.Models;
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml.Linq;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly string _salesPortalUrl;
    private readonly string _terminalId;

    // Historial de escaneos para la API history/today
    private static readonly ConcurrentDictionary<string, TicketResponse> _scannedTickets = new();

    public TicketController(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _salesPortalUrl = configuration["SalesPortal:Url"]
            ?? throw new InvalidOperationException("SalesPortal:Url no está configurado en appsettings.json");
        _terminalId = configuration["SalesPortal:TerminalId"]
            ?? throw new InvalidOperationException("SalesPortal:TerminalId no está configurado en appsettings.json");
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

        // PRUEBA: Enviar el folio crudo (tal como viene en el QR) con todos los ceros
        // para validar si el portal lo reconoce exactamente así.
        string voucherReference = barcode.Trim();

        // 2. Consultar el Sales Portal real
        XDocument portalXml;
        try
        {
            portalXml = await QuerySalesPortalAsync(voucherReference);
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
        string pelicula = admitoneNode.Element("voucherTypeName")?.Value ?? string.Empty;

        TicketResponse finalResponse;

        if (resultCode == "0") // 0 = Éxito
        {
            var redeemedNode = admitoneNode.Element("redeemed");
            var expiredNode  = admitoneNode.Element("expired");

            if (redeemedNode != null)
            {
                // El portal indica que ya fue canjeado → DUPLICADO
                finalResponse = new TicketResponse
                {
                    Status   = "DUPLICATE",
                    Message  = "Esta orden ya fue registrada anteriormente.",
                    Folio    = barcode,
                    Pelicula = pelicula
                };
            }
            else if (expiredNode != null && DateTime.TryParse(expiredNode.Value, out var expDate) && expDate < now)
            {
                // Boleto expirado
                finalResponse = new TicketResponse
                {
                    Status   = "INVALID",
                    Message  = "El boleto ha expirado.",
                    Folio    = barcode,
                    Pelicula = pelicula
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
                    Asientos   = new List<string> { "N/A" },
                    ScannedAt  = now
                };

                // Guardar en el historial de escaneos exitosos del día
                _scannedTickets.TryAdd(Guid.NewGuid().ToString(), finalResponse);
            }
        }
        else if (resultCode == "156") // Voucher Reference Invalid
        {
            finalResponse = new TicketResponse
            {
                Status  = "INVALID",
                Message = $"Orden con folio '{voucherReference}' no encontrada en el sistema.",
                Folio   = barcode
            };
        }
        else if (resultCode == "3") // Terminal no autorizada o solicitud rechazada por el portal
        {
            finalResponse = new TicketResponse
            {
                Status  = "INVALID",
                Message = "El portal rechazó la solicitud. Verifica que la terminal esté autorizada para consultar vouchers (cód. 3).",
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
    /// Envía una solicitud XML al Sales Portal (admitone requestId="503") y devuelve la respuesta parseada.
    /// </summary>
    private async Task<XDocument> QuerySalesPortalAsync(string voucherReference)
    {
        // XML en una sola línea sin espacios ni saltos de línea (requerido por admitOne)
        string xmlBody = $"<?xml version=\"1.0\" encoding=\"UTF-8\"?><admitOne requestId=\"503\" terminal=\"{_terminalId}\"><action>get</action><voucherReference>{voucherReference}</voucherReference></admitOne>";

        var client = _httpClientFactory.CreateClient();
        var content = new FormUrlEncodedContent(new Dictionary<string, string>
        {
            { "XML", xmlBody }  // El parámetro DEBE llamarse "XML" según documentación
        });

        var httpResponse = await client.PostAsync(_salesPortalUrl, content);
        httpResponse.EnsureSuccessStatusCode();

        string xmlResponse = await httpResponse.Content.ReadAsStringAsync();
        return XDocument.Parse(xmlResponse);
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
