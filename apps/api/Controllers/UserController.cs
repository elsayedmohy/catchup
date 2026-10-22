using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using api.Data;
using System.Security.Claims;

namespace api.Controllers;

[ApiController]
[Route("api/user")]
[Authorize]
public class UserController : ControllerBase
{
    private readonly CatchupDbContext _context;

    public UserController(CatchupDbContext context)
    {
        _context = context;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

        if (user is null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "User not found" } });

        return Ok(new
        {
            id = user.Id,
            email = user.Email,
            createdAt = user.CreatedAt
        });
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteAccount()
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

        if (user is null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "User not found" } });

        // Rotate the security stamp so any outstanding access tokens stop working
        // immediately, then cascade-delete the user and all of their saved items.
        user.SecurityStamp = Guid.NewGuid();
        await _context.SaveChangesAsync();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
