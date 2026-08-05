using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using System.Collections.Concurrent;
using System;
using System.Linq;
using System.Collections.Generic;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketController : ControllerBase
{
    // Historial de escaneos para la API history/today
    private static readonly ConcurrentDictionary<string, TicketResponse> _scannedTickets = new();

    // Diccionario en memoria para simular las respuestas del Sales Portal (como proporcionó el usuario)
    private static readonly ConcurrentDictionary<string, OrderData> _mockSalesPortalDb = new(
        new Dictionary<string, OrderData>
        {
            { "1234567890", new OrderData { Status = "VALID", Details = "Deadpool & Wolverine - 2 Boletos", Used = false } },
            { "0987654321", new OrderData { Status = "USED", Details = "Intensamente 2 - 1 Boleto", Used = true } },
            { "5555555555", new OrderData { Status = "CANCELLED", Details = "Cancelada", Used = false } }
        }
    );

    [HttpPost("validate")]
    public IActionResult Validate([FromBody] TicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Folio))
            return BadRequest(new { Message = "Folio inválido." });

        var barcode = request.Folio.Trim();
        var now = DateTime.Now;

        // 1. Extraer y Validar el Audit Number (Soporta v1 y v2)
        var extractionResult = ExtractAuditNumber(barcode);
        
        if (!extractionResult.Success)
        {
            var response = new TicketResponse 
            { 
                Status = "INVALID", 
                Message = extractionResult.ErrorMessage, 
                Folio = barcode 
            };
            return Ok(response); 
        }

        string auditNumber = extractionResult.AuditNumber;

        // 2. Consultar el Sales Portal Simulado
        var portalResponse = QuerySalesPortal(auditNumber);

        TicketResponse finalResponse;

        // 3. Interpretar la respuesta
        if (!portalResponse.Found)
        {
            finalResponse = new TicketResponse 
            { 
                Status = "INVALID", 
                Message = $"Orden con audit '{auditNumber}' no encontrada en el sistema.", 
                Folio = barcode 
            };
        }
        else if (portalResponse.Status == "VALID" && !portalResponse.Used)
        {
            // Marcar como usado localmente en el mock db para que el siguiente escaneo marque DUPLICADO
            _mockSalesPortalDb[auditNumber].Used = true;
            _mockSalesPortalDb[auditNumber].Status = "USED";

            finalResponse = new TicketResponse 
            { 
                Status = "VALID", 
                Message = "La orden es válida y ha sido registrada.", 
                Folio = barcode,
                Pelicula = portalResponse.Details,
                Asientos = new List<string> { "N/A" }, 
                ScannedAt = now
            };
            
            // Guardar en el historial de escaneos exitosos
            _scannedTickets.TryAdd(Guid.NewGuid().ToString(), finalResponse);
        }
        else if (portalResponse.Status == "USED" || portalResponse.Used)
        {
            finalResponse = new TicketResponse 
            { 
                Status = "DUPLICATE", 
                Message = "Esta orden ya fue registrada anteriormente.", 
                Folio = barcode,
                Pelicula = portalResponse.Details
            };
        }
        else
        {
            finalResponse = new TicketResponse 
            { 
                Status = "INVALID", 
                Message = $"La orden no es válida (estado: {portalResponse.Status}).", 
                Folio = barcode 
            };
        }

        return Ok(finalResponse);
    }

    [HttpGet("history/today")]
    public IActionResult GetTodayHistory()
    {
        var today = DateTime.Today;
        var history = _scannedTickets.Values
            .Where(t => t.Status == "VALID" && t.ScannedAt.Date == today)
            .OrderByDescending(t => t.ScannedAt)
            .ToList();

        return Ok(history);
    }

    // --- Métodos de Ayuda ---

    private ExtractionResult ExtractAuditNumber(string barcode)
    {
        if (!barcode.StartsWith("9O"))
        {
            return new ExtractionResult { Success = false, ErrorMessage = "El código debe iniciar con '9O'." };
        }

        if (barcode.Length == 12)
        {
            // Formato v1: 9O + 10 dígitos numéricos
            string auditPart = barcode.Substring(2, 10);
            if (auditPart.All(char.IsDigit))
            {
                return new ExtractionResult { Success = true, AuditNumber = auditPart };
            }
            return new ExtractionResult { Success = false, ErrorMessage = "Formato v1 inválido: Debe contener 10 dígitos numéricos." };
        }
        else if (barcode.Length == 14)
        {
            // Formato v2: 9O + 10 caracteres (mezclados num/letras) + XX
            if (!barcode.EndsWith("XX"))
            {
                return new ExtractionResult { Success = false, ErrorMessage = "Formato v2 inválido: Debe terminar en 'XX'." };
            }
            
            string auditPart = barcode.Substring(2, 10);
            
            // Limpiamos los caracteres no numéricos (padding)
            string numericAudit = new string(auditPart.Where(char.IsDigit).ToArray());
            
            if (string.IsNullOrEmpty(numericAudit))
            {
                return new ExtractionResult { Success = false, ErrorMessage = "Formato v2 inválido: No se encontraron números en la referencia." };
            }

            // Dependiendo del sistema, podría ser necesario rellenar con ceros a la izquierda si al quitar letras quedan menos de 10.
            // Lo rellenamos a 10 caracteres (como asume el mockDB "1234567890").
            numericAudit = numericAudit.PadLeft(10, '0');

            return new ExtractionResult { Success = true, AuditNumber = numericAudit };
        }

        return new ExtractionResult { Success = false, ErrorMessage = "Longitud de código inválida. Se esperaban 12 o 14 caracteres." };
    }

    private PortalResponse QuerySalesPortal(string auditNumber)
    {
        if (_mockSalesPortalDb.TryGetValue(auditNumber, out var orderData))
        {
            return new PortalResponse { Found = true, Status = orderData.Status, Used = orderData.Used, Details = orderData.Details };
        }
        return new PortalResponse { Found = false };
    }
}

// --- Clases Auxiliares ---
public class OrderData 
{ 
    public string Status { get; set; } = string.Empty; 
    public string Details { get; set; } = string.Empty; 
    public bool Used { get; set; } 
}

public class PortalResponse 
{ 
    public bool Found { get; set; } 
    public string? Status { get; set; } 
    public bool Used { get; set; }
    public string? Details { get; set; }
}

public class ExtractionResult
{
    public bool Success { get; set; }
    public string AuditNumber { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
}
