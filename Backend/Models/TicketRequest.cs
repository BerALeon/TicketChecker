using System.Collections.Generic;

namespace Backend.Models;

public class TicketRequest
{
    public string Folio { get; set; } = string.Empty;
    public string Pelicula { get; set; } = string.Empty;
    public List<string> Asientos { get; set; } = new();
}
