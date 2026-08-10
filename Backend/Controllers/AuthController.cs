using Microsoft.AspNetCore.Mvc;
using Backend.Models;
using System.DirectoryServices.Protocols;
using System.Net;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    // Las credenciales de acceso provienen de appsettings.json (sección Auth)
    private readonly string _demoUser;
    private readonly string _demoPass;

    public AuthController(IConfiguration configuration)
    {
        _demoUser = configuration["Auth:Username"] ?? "demo";
        _demoPass = configuration["Auth:Password"] ?? "demo";
    }

    [HttpPost("login")]
    public IActionResult Login([FromBody] LoginRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest(new LoginResponse { Success = false, Message = "Usuario y contraseña requeridos." });

        try
        {
            // Note: The LDAP connection is stubbed for now until the actual Active Directory is available.
            // When real AD is available, uncomment the code below:
            
            /*
            using (var connection = new LdapConnection(new LdapDirectoryIdentifier(_ldapServer)))
            {
                var networkCredential = new NetworkCredential(request.Username, request.Password, _domain);
                connection.Credential = networkCredential;
                connection.AuthType = AuthType.Negotiate;
                connection.Bind(networkCredential);
            }
            */

            // Validación contra credenciales configuradas en appsettings.json
            if (request.Username == _demoUser && request.Password == _demoPass)
            {
                return Ok(new LoginResponse 
                { 
                    Success = true, 
                    Token = "ticket-checker-session-token", 
                    Message = "Autenticación exitosa." 
                });
            }

            return Unauthorized(new LoginResponse { Success = false, Message = "Credenciales incorrectas." });
        }
        catch (LdapException ex)
        {
            return Unauthorized(new LoginResponse { Success = false, Message = "Error de autenticación LDAP: " + ex.Message });
        }
        catch (System.Exception ex)
        {
            return StatusCode(500, new LoginResponse { Success = false, Message = "Error interno: " + ex.Message });
        }
    }
}
