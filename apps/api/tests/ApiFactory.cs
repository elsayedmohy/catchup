using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using api.Data;

namespace Catchup.Api.Tests;

/// <summary>
/// Boots the real API against the PostgreSQL test database so that
/// Npgsql-specific query translation (ILIKE) and cascade behaviour are exercised.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private const string TestConnectionString =
        "Host=127.0.0.1;Port=5433;Database=catchup_test;Username=postgres;Password=postgres";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = TestConnectionString,
                ["Jwt:Key"] = "integration-test-secret-key-at-least-32-characters-long",
                ["Jwt:Issuer"] = "CatchupApi",
                ["Jwt:Audience"] = "CatchupApp",
                ["Jwt:ExpiryMinutes"] = "60"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove the production DbContext registration and substitute the test one
            services.RemoveAll<DbContextOptions<CatchupDbContext>>();
            services.RemoveAll<CatchupDbContext>();

            services.AddDbContext<CatchupDbContext>(options =>
                options.UseNpgsql(TestConnectionString));

            // Metadata extraction must not make real network calls during tests
            services.RemoveAll<api.Services.ISafeHttpFetcher>();
            services.AddSingleton<api.Services.ISafeHttpFetcher, StubSafeHttpFetcher>();
        });
    }

    async Task IAsyncLifetime.InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<CatchupDbContext>();

        await db.Database.EnsureDeletedAsync();
        await db.Database.EnsureCreatedAsync();
    }

    Task IAsyncLifetime.DisposeAsync() => Task.CompletedTask;
}

/// <summary>
/// Returns a fixed HTML document so metadata extraction is deterministic offline.
/// </summary>
public sealed class StubSafeHttpFetcher : api.Services.ISafeHttpFetcher
{
    public Task<api.Services.FetchResult> FetchAsync(string url, CancellationToken ct = default)
        => Task.FromResult(new api.Services.FetchResult(
            Success: false,
            Html: null,
            FinalUrl: null,
            Error: "network disabled in tests"));
}
