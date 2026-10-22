using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using api.Data;

namespace api.Data;

/// <summary>
/// Design-time factory used by `dotnet ef` to create the DbContext for migrations.
/// </summary>
public class CatchupDbContextFactory : IDesignTimeDbContextFactory<CatchupDbContext>
{
    public CatchupDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<CatchupDbContext>();
        optionsBuilder.UseNpgsql(
            "Host=127.0.0.1;Port=5433;Database=catchup;Username=postgres;Password=postgres");

        return new CatchupDbContext(optionsBuilder.Options);
    }
}
