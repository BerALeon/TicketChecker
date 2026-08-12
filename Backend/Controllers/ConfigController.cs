using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConfigController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IHostEnvironment _env;

    public ConfigController(IConfiguration configuration, IHostEnvironment env)
    {
        _configuration = configuration;
        _env = env;
    }

    [HttpGet("status")]
    public IActionResult GetStatus()
    {
        if (_configuration is IConfigurationRoot configRoot)
        {
            configRoot.Reload();
        }

        var url = _configuration["SalesPortal:Url"];
        var terminalId = _configuration["SalesPortal:TerminalId"];

        var isConfigured = !string.IsNullOrWhiteSpace(url) && 
                           !string.IsNullOrWhiteSpace(terminalId) &&
                           url != "http://0.0.0.0"; 

        return Ok(new { isConfigured });
    }

    [HttpPost("setup")]
    public async Task<IActionResult> Setup([FromBody] SetupRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url) || string.IsNullOrWhiteSpace(request.TerminalId))
        {
            return BadRequest(new { Message = "Url y TerminalId son requeridos." });
        }

        var appSettingsPath = Path.Combine(_env.ContentRootPath, "appsettings.json");
        
        string json = await System.IO.File.ReadAllTextAsync(appSettingsPath);
        var jsonNode = JsonNode.Parse(json);
        
        if (jsonNode != null)
        {
            if (jsonNode["SalesPortal"] == null)
            {
                jsonNode["SalesPortal"] = new JsonObject();
            }
            jsonNode["SalesPortal"]["Url"] = request.Url;
            jsonNode["SalesPortal"]["TerminalId"] = request.TerminalId;

            var options = new JsonSerializerOptions { WriteIndented = true };
            await System.IO.File.WriteAllTextAsync(appSettingsPath, jsonNode.ToJsonString(options));
            
            if (_configuration is IConfigurationRoot configRoot)
            {
                configRoot.Reload();
            }

            return Ok(new { Message = "Configuración guardada exitosamente." });
        }

        return StatusCode(500, new { Message = "No se pudo leer appsettings.json" });
    }
}

public class SetupRequest
{
    public string Url { get; set; } = string.Empty;
    public string TerminalId { get; set; } = string.Empty;
}
