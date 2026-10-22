using System.Net;
using System.Net.Sockets;
using System.Text.RegularExpressions;

namespace api.Services;

public interface ISafeHttpFetcher
{
    Task<FetchResult> FetchAsync(string url, CancellationToken ct = default);
}

public record FetchResult(bool Success, string? Html, string? FinalUrl, string? Error);

/// <summary>
/// HTTP client that blocks requests to loopback, private, link-local and other
/// internal destinations. Protects the metadata pipeline against SSRF.
/// </summary>
public partial class SafeHttpFetcher : ISafeHttpFetcher
{
    private const int MaxResponseBytes = 2 * 1024 * 1024; // 2MB
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(10);

    private readonly IHttpClientFactory _factory;
    private readonly ILogger<SafeHttpFetcher> _logger;

    public SafeHttpFetcher(IHttpClientFactory factory, ILogger<SafeHttpFetcher> logger)
    {
        _factory = factory;
        _logger = logger;
    }

    [GeneratedRegex(@"^(https?)://", RegexOptions.IgnoreCase)]
    private static partial Regex AllowedSchemeRegex();

    public async Task<FetchResult> FetchAsync(string url, CancellationToken ct = default)
    {
        // 1. Scheme allowlist
        if (!AllowedSchemeRegex().IsMatch(url))
            return new FetchResult(false, null, null, "Unsupported URL scheme");

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return new FetchResult(false, null, null, "Malformed URL");

        // 2. Block embedded credentials
        if (!string.IsNullOrEmpty(uri.UserInfo))
            return new FetchResult(false, null, null, "URLs with credentials are not allowed");

        // 3. Validate the host resolves to public addresses only
        if (!await IsHostPublicAsync(uri.Host))
            return new FetchResult(false, null, null, "Destination address is not permitted");

        var handler = new HttpClientHandler
        {
            AllowAutoRedirect = false, // we validate each redirect manually
            UseCookies = false,
            UseProxy = false
        };

        using var client = new HttpClient(handler) { Timeout = Timeout };
        client.DefaultRequestHeaders.TryAddWithoutValidation("User-Agent", "CatchupBot/1.0 (+metadata-fetch)");
        client.DefaultRequestHeaders.TryAddWithoutValidation("Accept", "text/html,application/xhtml+xml");

        var current = uri;

        try
        {
            // Follow up to 5 redirects, validating every hop
            for (var hop = 0; hop <= 5; hop++)
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, current);
                using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, ct);

                if (IsRedirect((int)response.StatusCode))
                {
                    var location = response.Headers.Location;
                    if (location is null)
                        return new FetchResult(false, null, null, "Redirect without location");

                    var next = location.IsAbsoluteUri ? location : new Uri(current, location);

                    if (!AllowedSchemeRegex().IsMatch(next.ToString()))
                        return new FetchResult(false, null, null, "Redirect to unsupported scheme");

                    if (!string.IsNullOrEmpty(next.UserInfo))
                        return new FetchResult(false, null, null, "Redirect to URL with credentials");

                    if (!await IsHostPublicAsync(next.Host))
                        return new FetchResult(false, null, null, "Redirect to a non-permitted address");

                    current = next;
                    continue;
                }

                if (!response.IsSuccessStatusCode)
                    return new FetchResult(false, null, null, $"HTTP {(int)response.StatusCode}");

                // 4. Enforce a response size limit
                if (response.Content.Headers.ContentLength > MaxResponseBytes)
                    return new FetchResult(false, null, null, "Response too large");

                var html = await ReadLimitedAsync(response, ct);
                if (html is null)
                    return new FetchResult(false, null, null, "Response too large");

                return new FetchResult(true, html, current.ToString(), null);
            }

            return new FetchResult(false, null, null, "Too many redirects");
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Metadata fetch failed for {Host}", current.Host);
            return new FetchResult(false, null, null, "Network error");
        }
        catch (TaskCanceledException)
        {
            return new FetchResult(false, null, null, "Request timed out");
        }
    }

    private static bool IsRedirect(int statusCode) =>
        statusCode is 301 or 302 or 303 or 307 or 308;

    private static async Task<string?> ReadLimitedAsync(HttpResponseMessage response, CancellationToken ct)
    {
        await using var stream = await response.Content.ReadAsStreamAsync(ct);
        using var memory = new MemoryStream();
        var buffer = new byte[8192];
        int read;

        while ((read = await stream.ReadAsync(buffer, ct)) > 0)
        {
            if (memory.Length + read > MaxResponseBytes)
                return null;
            memory.Write(buffer, 0, read);
        }

        var charset = response.Content.Headers.ContentType?.CharSet;
        var encoding = System.Text.Encoding.UTF8;
        if (!string.IsNullOrEmpty(charset))
        {
            try { encoding = System.Text.Encoding.GetEncoding(charset); }
            catch { /* fall back to UTF-8 */ }
        }

        return encoding.GetString(memory.ToArray());
    }

    /// <summary>
    /// Resolves the host and verifies every resolved address is a public, routable address.
    /// </summary>
    private async Task<bool> IsHostPublicAsync(string host)
    {
        // Literal IP addresses are checked directly
        if (IPAddress.TryParse(host, out var literal))
            return IsPublicAddress(literal);

        IPAddress[] addresses;
        try
        {
            var entries = await Dns.GetHostAddressesAsync(host);
            if (entries.Length == 0)
                return false;
            addresses = entries;
        }
        catch
        {
            return false;
        }

        return addresses.All(IsPublicAddress);
    }

    /// <summary>
    /// Returns true when the address is a public, routable address.
    /// Exposed as internal for unit testing.
    /// </summary>
    internal static bool IsPublicAddress(IPAddress address)
    {
        if (IPAddress.IsLoopback(address)) return false;
        if (address.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (address.IsIPv6LinkLocal) return false;
            if (address.IsIPv6SiteLocal) return false;
            if (address.IsIPv6Multicast) return false;

            // Unique local (fc00::/7) and IPv4-mapped (::ffff:0:0/96)
            var bytes = address.GetAddressBytes();
            if ((bytes[0] & 0xFE) == 0xFC) return false;
            if (bytes[0] == 0xFF && bytes[1] == 0xFF)
                return IsPublicAddress(new IPAddress(bytes.Skip(12).ToArray()));

            return true;
        }

        var b = address.GetAddressBytes();
        if (b[0] == 0) return false;                       // 0.0.0.0/8
        if (b[0] == 10) return false;                      // 10.0.0.0/8
        if (b[0] == 127) return false;                     // 127.0.0.0/8
        if (b[0] == 169 && b[1] == 254) return false;      // 169.254.0.0/16 (link-local + cloud metadata)
        if (b[0] == 172 && b[1] >= 16 && b[1] <= 31) return false; // 172.16.0.0/12
        if (b[0] == 192 && b[1] == 168) return false;      // 192.168.0.0/16
        if (b[0] == 100 && b[1] >= 64 && b[1] <= 127) return false; // 100.64.0.0/10 CGNAT
        if (b[0] == 192 && b[1] == 0 && b[2] == 0) return false; // 192.0.0.0/24
        if (b[0] == 198 && (b[1] == 18 || b[1] == 19)) return false; // 198.18.0.0/15
        if (b[0] >= 224) return false;                     // multicast + reserved

        return true;
    }
}
