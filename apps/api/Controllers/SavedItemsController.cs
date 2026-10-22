using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using api.Data;
using api.Models;
using api.Services;
using System.Security.Claims;

namespace api.Controllers;

[ApiController]
[Route("api/items")]
[Authorize]
public class SavedItemsController : ControllerBase
{
    private readonly CatchupDbContext _context;
    private readonly IMetadataExtractor _metadataExtractor;
    private readonly ILogger<SavedItemsController> _logger;

    public SavedItemsController(
        CatchupDbContext context,
        IMetadataExtractor metadataExtractor,
        ILogger<SavedItemsController> logger)
    {
        _context = context;
        _metadataExtractor = metadataExtractor;
        _logger = logger;
    }

    private Guid CurrentUserId =>
        Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateItemRequest request)
    {
        var normalized = UrlNormalizer.Normalize(request.OriginalUrl);
        if (normalized is null)
        {
            return BadRequest(new
            {
                error = new
                {
                    code = "INVALID_URL",
                    message = "A valid http or https URL is required"
                }
            });
        }

        // Idempotency: an existing item for the same user + normalized URL is returned
        var existing = await _context.SavedItems
            .FirstOrDefaultAsync(i => i.UserId == CurrentUserId && i.NormalizedUrl == normalized);

        if (existing is not null)
        {
            return Ok(ToResponse(existing));
        }

        var item = new SavedItem
        {
            UserId = CurrentUserId,
            OriginalUrl = request.OriginalUrl.Trim(),
            NormalizedUrl = normalized,
            Title = request.Title,
            Source = UrlNormalizer.InferSource(request.OriginalUrl),
            MetadataStatus = MetadataStatus.Pending
        };

        _context.SavedItems.Add(item);
        await _context.SaveChangesAsync();

        // Best-effort metadata extraction. Failure must never lose the saved URL.
        try
        {
            var metadata = await _metadataExtractor.ExtractAsync(item.OriginalUrl);
            item.Title ??= metadata.Title;
            item.Description = metadata.Description;
            item.ImageUrl = metadata.ImageUrl;
            item.MetadataStatus = metadata.Status;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Metadata extraction failed for item {ItemId}", item.Id);
            item.MetadataStatus = MetadataStatus.Failed;
        }

        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, ToResponse(item));
    }

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? cursor = null,
        [FromQuery] int limit = 20,
        [FromQuery] bool archived = false,
        [FromQuery] string? sort = "desc",
        [FromQuery] string? q = null,
        [FromQuery] string? source = null)
    {
        limit = Math.Clamp(limit, 1, 100);

        var query = _context.SavedItems.Where(i => i.UserId == CurrentUserId);

        query = archived
            ? query.Where(i => i.ArchivedAt != null)
            : query.Where(i => i.ArchivedAt == null);

        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            query = query.Where(i =>
                (i.Title != null && EF.Functions.ILike(i.Title, $"%{term}%")) ||
                EF.Functions.ILike(i.OriginalUrl, $"%{term}%"));
        }

        if (!string.IsNullOrWhiteSpace(source))
        {
            query = query.Where(i => i.Source == source);
        }

        var ascending = string.Equals(sort, "asc", StringComparison.OrdinalIgnoreCase);
        query = ascending
            ? query.OrderBy(i => i.SavedAt).ThenBy(i => i.Id)
            : query.OrderByDescending(i => i.SavedAt).ThenByDescending(i => i.Id);

        // Cursor is the Id of the last item from the previous page.
        // Scope the lookup to the current user so a cursor can never resolve
        // to another user's row.
        if (!string.IsNullOrEmpty(cursor) && Guid.TryParse(cursor, out var cursorId))
        {
            var cursorSavedAt = await _context.SavedItems
                .Where(x => x.Id == cursorId && x.UserId == CurrentUserId)
                .Select(x => (DateTime?)x.SavedAt)
                .FirstOrDefaultAsync();

            if (cursorSavedAt is null)
            {
                // Unknown or foreign cursor: return an empty page rather than
                // silently restarting from the beginning.
                return Ok(new { items = Array.Empty<object>(), nextCursor = (string?)null, hasMore = false });
            }

            if (ascending)
                query = query.Where(i => i.SavedAt > cursorSavedAt.Value);
            else
                query = query.Where(i => i.SavedAt < cursorSavedAt.Value);
        }

        var items = await query.Take(limit + 1).ToListAsync();
        var hasMore = items.Count > limit;
        if (hasMore)
            items.RemoveAt(items.Count - 1);

        return Ok(new
        {
            items = items.Select(ToResponse),
            nextCursor = hasMore && items.Count > 0 ? items[^1].Id.ToString() : null,
            hasMore
        });
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var item = await _context.SavedItems
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == CurrentUserId);

        // Return 404 (not 403) so we do not leak the existence of other users' items
        if (item is null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Item not found" } });

        return Ok(ToResponse(item));
    }

    [HttpPut("{id}/archive")]
    public async Task<IActionResult> Archive(Guid id)
    {
        var item = await _context.SavedItems
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == CurrentUserId);

        if (item is null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Item not found" } });

        item.ArchivedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return Ok(ToResponse(item));
    }

    [HttpPut("{id}/restore")]
    public async Task<IActionResult> Restore(Guid id)
    {
        var item = await _context.SavedItems
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == CurrentUserId);

        if (item is null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Item not found" } });

        item.ArchivedAt = null;
        await _context.SaveChangesAsync();

        return Ok(ToResponse(item));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var item = await _context.SavedItems
            .FirstOrDefaultAsync(i => i.Id == id && i.UserId == CurrentUserId);

        if (item is null)
            return NotFound(new { error = new { code = "NOT_FOUND", message = "Item not found" } });

        _context.SavedItems.Remove(item);
        await _context.SaveChangesAsync();

        return NoContent();
    }

    private static object ToResponse(SavedItem item) => new
    {
        id = item.Id,
        userId = item.UserId,
        originalUrl = item.OriginalUrl,
        normalizedUrl = item.NormalizedUrl,
        title = item.Title,
        description = item.Description,
        imageUrl = item.ImageUrl,
        source = item.Source,
        savedAt = item.SavedAt,
        archivedAt = item.ArchivedAt,
        metadataStatus = item.MetadataStatus.ToString()
    };
}

public record CreateItemRequest(string OriginalUrl, string? Title);
