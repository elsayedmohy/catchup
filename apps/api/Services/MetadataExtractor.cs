using System.Text.RegularExpressions;
using api.Models;
namespace api.Services;

public interface IMetadataExtractor
{
    Task<MetadataResult> ExtractAsync(string url, CancellationToken ct = default);
}

/// <summary>
/// The outcome of a metadata extraction attempt. The status distinguishes
/// "could not reach the page" from "page reached but had no usable metadata".
/// </summary>
public record MetadataResult(
    MetadataStatus Status,
    string? Title,
    string? Description,
    string? ImageUrl)
{
    public static MetadataResult Failed { get; } = new(MetadataStatus.Failed, null, null, null);
    public static MetadataResult Skipped { get; } = new(MetadataStatus.Skipped, null, null, null);
}

/// <summary>
/// Extracts OpenGraph / Twitter Card / standard HTML metadata from a page.
/// Treats all fetched content as untrusted: values are decoded and length-capped,
/// and no markup is ever rendered or executed.
/// </summary>
public partial class MetadataExtractor : IMetadataExtractor
{
    private readonly ISafeHttpFetcher _fetcher;

    public MetadataExtractor(ISafeHttpFetcher fetcher)
    {
        _fetcher = fetcher;
    }

    // Matches a full tag, allowing ">" characters inside quoted attribute values
    [GeneratedRegex(@"<meta\s+(?:[^>""']|""[^""]*""|'[^']*')*>", RegexOptions.IgnoreCase)]
    private static partial Regex MetaTagRegex();

    [GeneratedRegex(@"<title[^>]*>(.*?)</title>", RegexOptions.IgnoreCase | RegexOptions.Singleline)]
    private static partial Regex TitleRegex();

    [GeneratedRegex(@"<link[^>]+>", RegexOptions.IgnoreCase)]
    private static partial Regex LinkTagRegex();

    public async Task<MetadataResult> ExtractAsync(string url, CancellationToken ct = default)
    {
        var result = await _fetcher.FetchAsync(url, ct);
        if (!result.Success || string.IsNullOrEmpty(result.Html))
            return MetadataResult.Failed;

        var html = result.Html;
        var tags = ParseMetaTags(html);

        var title = First(tags, "og:title")
            ?? First(tags, "twitter:title")
            ?? First(tags, "title")
            ?? ExtractTitle(html);

        var description = First(tags, "og:description")
            ?? First(tags, "twitter:description")
            ?? First(tags, "description");

        var image = First(tags, "og:image")
            ?? First(tags, "og:image:url")
            ?? First(tags, "twitter:image")
            ?? First(tags, "twitter:image:src");

        var cleanTitle = Clean(title, 512);
        var cleanDescription = Clean(description, 1024);
        var cleanImage = Clean(image, 2048);

        // The page was reachable but offered nothing usable
        if (cleanTitle is null && cleanDescription is null && cleanImage is null)
            return MetadataResult.Skipped;

        return new MetadataResult(
            MetadataStatus.Success,
            cleanTitle,
            cleanDescription,
            cleanImage);
    }

    private static Dictionary<string, string> ParseMetaTags(string html)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

        foreach (Match match in MetaTagRegex().Matches(html))
        {
            var tag = match.Value;
            var key = GetAttribute(tag, "property")
                ?? GetAttribute(tag, "name")
                ?? GetAttribute(tag, "itemprop");

            if (string.IsNullOrWhiteSpace(key))
                continue;

            var content = GetAttribute(tag, "content");
            if (string.IsNullOrWhiteSpace(content))
                continue;

            if (!result.ContainsKey(key))
                result[key] = content;
        }

        return result;
    }

    private static string? ExtractTitle(string html)
    {
        var match = TitleRegex().Match(html);
        if (!match.Success)
            return null;

        var title = match.Groups[1].Value;
        title = Regex.Replace(title, @"\s+", " ").Trim();
        return title.Length == 0 ? null : title;
    }

    private static string? GetAttribute(string tag, string attribute)
    {
        var pattern = $@"{attribute}\s*=\s*[""']([^""']*)[""']";
        var match = Regex.Match(tag, pattern, RegexOptions.IgnoreCase);
        return match.Success ? match.Groups[1].Value : null;
    }

    private static string? First(Dictionary<string, string> tags, string key) =>
        tags.TryGetValue(key, out var value) ? value : null;

    /// <summary>
    /// Decodes HTML entities and strips any residual markup, then caps the length.
    /// </summary>
    private static string? Clean(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var decoded = System.Net.WebUtility.HtmlDecode(value);
        var stripped = Regex.Replace(decoded, "<[^>]+>", "");
        stripped = Regex.Replace(stripped, @"\s+", " ").Trim();

        if (stripped.Length == 0)
            return null;

        return stripped.Length > maxLength ? stripped[..maxLength] : stripped;
    }
}
