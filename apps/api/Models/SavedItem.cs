using System.ComponentModel.DataAnnotations;

namespace api.Models;

public enum MetadataStatus
{
    Pending,
    Success,
    Failed,
    Skipped
}

public class SavedItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    [Required]
    [Url]
    [MaxLength(2048)]
    public string OriginalUrl { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(2048)]
    public string NormalizedUrl { get; set; } = string.Empty;
    
    [MaxLength(512)]
    public string? Title { get; set; }
    
    [MaxLength(1024)]
    public string? Description { get; set; }
    
    [MaxLength(2048)]
    public string? ImageUrl { get; set; }
    
    [MaxLength(100)]
    public string? Source { get; set; }
    
    public DateTime SavedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ArchivedAt { get; set; }
    
    public MetadataStatus MetadataStatus { get; set; } = MetadataStatus.Pending;
}
