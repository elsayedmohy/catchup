using Microsoft.EntityFrameworkCore;
using api.Models;

namespace api.Data;

public class CatchupDbContext : DbContext
{
    public CatchupDbContext(DbContextOptions<CatchupDbContext> options) : base(options)
    {
    }
    
    public DbSet<User> Users { get; set; }
    public DbSet<SavedItem> SavedItems { get; set; }
    
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("NOW()");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("NOW()");
        });
        
        modelBuilder.Entity<SavedItem>(entity =>
        {
            entity.HasOne(e => e.User)
                .WithMany(u => u.SavedItems)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
            
            entity.HasIndex(e => new { e.UserId, e.SavedAt });
            entity.HasIndex(e => new { e.UserId, e.NormalizedUrl });
            entity.HasIndex(e => new { e.UserId, e.ArchivedAt });
            
            entity.Property(e => e.SavedAt).HasDefaultValueSql("NOW()");
        });
    }
}
