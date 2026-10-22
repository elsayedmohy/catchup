using System.ComponentModel.DataAnnotations;

namespace api.Models;

public class User
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [EmailAddress]
    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;
    
    [Required]
    public string PasswordHash { get; set; } = string.Empty;
    
    /// <summary>
    /// Rotated whenever credentials change or the account is deleted.
    /// Embedded in issued access tokens so outstanding tokens can be invalidated.
    /// </summary>
    public Guid SecurityStamp { get; set; } = Guid.NewGuid();
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public ICollection<SavedItem> SavedItems { get; set; } = new List<SavedItem>();
}
