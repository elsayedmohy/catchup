using System.Text;
using System.Text.RegularExpressions;

namespace api.Services;

/// <summary>
/// Normalizes URLs for duplicate detection. Conservative by design:
/// only strips well-known tracking parameters and normalizes scheme/host casing
/// and trailing slashes. Never changes path or query semantics.
/// </summary>
public static partial class UrlNormalizer
{
    // Tracking parameters that are safe to strip - these never affect content identity
    private static readonly HashSet<string> TrackingParams = new(StringComparer.OrdinalIgnoreCase)
    {
        "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
        "fbclid", "gclid", "dclid", "msclkid", "twclid", "igshid", "igsh", "mibextid",
        "ref", "referrer", "source", "src", "share_id", "si", "feature", "app", "platform",
        "yclid", "_hsenc", "_hsmi", "vero_id", "s_kwcid", "vero_conv", "spm", "scm",
        "cmpid", "campaignid", "adgroupid", "adid", "ttclid", "li_fat_id", "epik", "s"
    };

    [GeneratedRegex(@"^https?://", RegexOptions.IgnoreCase)]
    private static partial Regex SchemeRegex();

    [GeneratedRegex(@"^[^:/?#]+://", RegexOptions.IgnoreCase)]
    private static partial Regex SchemeAnyRegex();

    /// <summary>
    /// Produces a canonical form of the URL used for duplicate detection.
    /// Returns null if the URL is not a valid http/https URL.
    /// </summary>
    public static string? Normalize(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        var trimmed = url.Trim();

        // Only http and https are supported
        if (!SchemeRegex().IsMatch(trimmed))
            return null;

        if (!Uri.TryCreate(trimmed, UriKind.Absolute, out var uri))
            return null;

        var scheme = uri.Scheme.ToLowerInvariant();
        var host = uri.Host.ToLowerInvariant();

        // Strip "www." prefix - same site, consistent grouping
        if (host.StartsWith("www.", StringComparison.Ordinal))
            host = host[4..];

        var port = uri.IsDefaultPort ? string.Empty : $":{uri.Port}";
        var path = uri.AbsolutePath;
        var query = NormalizeQuery(uri.Query);

        // Normalize trailing slash (except for root)
        if (path.Length > 1 && path.EndsWith('/'))
            path = path.TrimEnd('/');

        if (path.Length == 0)
            path = "/";

        var builder = new StringBuilder();
        builder.Append(scheme).Append("://").Append(host).Append(port).Append(path);
        if (query.Length > 0)
            builder.Append('?').Append(query);

        return builder.ToString();
    }

    private static string NormalizeQuery(string query)
    {
        if (string.IsNullOrEmpty(query) || query == "?")
            return string.Empty;

        var raw = query[1..];
        if (string.IsNullOrEmpty(raw))
            return string.Empty;

        var kept = raw
            .Split('&', StringSplitOptions.RemoveEmptyEntries)
            .Where(part => !TrackingParams.Contains(part.Split('=', 2)[0]))
            .OrderBy(part => part, StringComparer.Ordinal)
            .ToList();

        return string.Join('&', kept);
    }

    /// <summary>
    /// Infers a source label from the URL host. Returns null when unknown.
    /// </summary>
    public static string? InferSource(string? url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return null;

        if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
            return null;

        var host = uri.Host.ToLowerInvariant();
        if (host.StartsWith("www.", StringComparison.Ordinal))
            host = host[4..];

        var known = new Dictionary<string, string>
        {
            ["instagram.com"] = "Instagram",
            ["tiktok.com"] = "TikTok",
            ["facebook.com"] = "Facebook",
            ["fb.com"] = "Facebook",
            ["youtube.com"] = "YouTube",
            ["youtu.be"] = "YouTube",
            ["twitter.com"] = "X",
            ["x.com"] = "X",
            ["reddit.com"] = "Reddit",
            ["linkedin.com"] = "LinkedIn",
            ["pinterest.com"] = "Pinterest",
            ["medium.com"] = "Medium",
            ["substack.com"] = "Substack",
            ["news.ycombinator.com"] = "Hacker News",
            ["threads.net"] = "Threads",
            ["t.me"] = "Telegram",
            ["wa.me"] = "WhatsApp",
            ["spotify.com"] = "Spotify",
            ["github.com"] = "GitHub",
            ["stackoverflow.com"] = "Stack Overflow",
            ["google.com"] = "Google",
            ["bing.com"] = "Bing",
            ["amazon.com"] = "Amazon",
            ["ebay.com"] = "eBay",
            ["etsy.com"] = "Etsy",
            ["amazon.in"] = "Amazon",
        };

        if (known.TryGetValue(host, out var source))
            return source;

        // Subdomain match for regional variants (e.g. www.youtube.com, m.facebook.com)
        foreach (var (domain, label) in known)
        {
            if (host.EndsWith($".{domain}", StringComparison.Ordinal))
                return label;
        }

        return null;
    }
}
