using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using api.Data;

namespace api.Middleware;

/// <summary>
/// Validates that the user referenced by an access token still exists and that the
/// token's security stamp matches the current one. This makes account deletion and
/// credential changes immediately invalidate outstanding access tokens.
/// </summary>
public static class TokenValidation
{
    public const string SecurityStampClaim = "sid";

    public static void Configure(JwtBearerOptions options)
    {
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var userIdClaim = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var stampClaim = context.Principal?.FindFirst(SecurityStampClaim)?.Value;

                if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                {
                    context.Fail("Invalid token subject");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<CatchupDbContext>();

                var user = await db.Users
                    .AsNoTracking()
                    .FirstOrDefaultAsync(u => u.Id == userId);

                if (user is null)
                {
                    // The account was deleted - outstanding tokens must not work.
                    context.Fail("Account no longer exists");
                    return;
                }

                if (stampClaim is null || !Guid.TryParse(stampClaim, out var tokenStamp) || tokenStamp != user.SecurityStamp)
                {
                    context.Fail("Token has been revoked");
                    return;
                }
            }
        };
    }
}
