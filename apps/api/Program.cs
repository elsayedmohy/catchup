using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using api;
using api.Data;
using api.Middleware;
using api.Services;
using FluentValidation;
using FluentValidation.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options => SwaggerConfig.Configure(options));

// Database
builder.Services.AddDbContext<CatchupDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// FluentValidation
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();

// JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer();

// Configure the bearer options from the final DI-resolved IConfiguration so that
// validation always uses exactly the same key/issuer/audience that token issuance
// reads. Reading builder.Configuration here would capture a different config
// instance and silently produce a key mismatch.
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IConfiguration>((options, config) =>
    {
        var jwt = config.GetSection("Jwt");
        var key = jwt["Key"];

        if (string.IsNullOrWhiteSpace(key))
            throw new InvalidOperationException("Jwt:Key is not configured.");

        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
        };

        // Revokes tokens for deleted accounts and changed credentials
        TokenValidation.Configure(options);
    });

builder.Services.AddAuthorization();

// Metadata extraction (SSRF-protected HTTP fetch + HTML metadata parsing)
builder.Services.AddHttpClient();
builder.Services.AddSingleton<ISafeHttpFetcher, SafeHttpFetcher>();
builder.Services.AddSingleton<IMetadataExtractor, MetadataExtractor>();

// CORS - origins are configuration driven so production is not wide open
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:8081"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("CatchupClients", policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyMethod()
              .AllowAnyHeader()
              .WithExposedHeaders("WWW-Authenticate");
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("CatchupClients");
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

/// <summary>
/// Exposed so integration tests can use WebApplicationFactory.
/// </summary>
public partial class Program { }
