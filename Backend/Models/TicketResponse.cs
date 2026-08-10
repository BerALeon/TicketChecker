using System;
using System.Collections.Generic;

namespace Backend.Models;

public class TicketResponse
{
    public string Status { get; set; } = string.Empty; // "VALID", "INVALID", "DUPLICATE"
    public string Message { get; set; } = string.Empty;
    public string Folio { get; set; } = string.Empty;
    public string Pelicula { get; set; } = string.Empty;
    public List<string> Asientos { get; set; } = new();
    public DateTime? ScannedAt { get; set; }
}
