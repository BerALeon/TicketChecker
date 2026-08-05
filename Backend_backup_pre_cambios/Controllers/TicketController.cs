using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using System.Collections.Concurrent;
using System;
using System.Linq;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TicketController : ControllerBase
{
    // In-memory static tracking for this demo
    private static readonly ConcurrentDictionary<string, TicketResponse> _scannedTickets = new();

    [HttpPost("validate")]
    public IActionResult Validate([FromBody] TicketRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Folio))
            return BadRequest(new { Message = "Folio inválido." });

        var now = DateTime.Now;

        // Check if duplicate
        if (_scannedTickets.ContainsKey(request.Folio))
        {
            var existing = _scannedTickets[request.Folio];
            return Ok(new TicketResponse 
            { 
                Status = "DUPLICATE", 
                Message = "Boleto ya utilizado.", 
                Folio = request.Folio,
                Pelicula = existing.Pelicula,
                Asientos = existing.Asientos,
                ScannedAt = existing.ScannedAt
            });
        }

        var normalizedFolio = request.Folio.Replace(" ", "").ToUpperInvariant();

        // Dummy validation logic: folio must start with 'CINEMEX'
        if (!normalizedFolio.StartsWith("CINEMEX"))
        {
            return Ok(new TicketResponse 
            { 
                Status = "INVALID", 
                Message = "El QR no existe o no cumple el formato esperado.", 
                Folio = request.Folio 
            });
        }

        // Valid ticket
        var response = new TicketResponse
        {
            Status = "VALID",
            Message = "Boleto válido.",
            Folio = request.Folio,
            Pelicula = string.IsNullOrWhiteSpace(request.Pelicula) ? "Película Desconocida" : request.Pelicula,
            Asientos = request.Asientos,
            ScannedAt = now
        };

        _scannedTickets.TryAdd(request.Folio, response);

        return Ok(response);
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
}
