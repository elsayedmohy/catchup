using api.Models;
using api.Services;

namespace Catchup.Api.Tests;

public class MetadataExtractorTests
{
    private sealed class StubFetcher : ISafeHttpFetcher
    {
        private readonly string? _html;
        public StubFetcher(string? html) => _html = html;

        public Task<FetchResult> FetchAsync(string url, CancellationToken ct = default)
            => Task.FromResult(new FetchResult(
                Success: _html is not null,
                Html: _html,
                FinalUrl: url,
                Error: _html is null ? "network error" : null));
    }

    [Fact]
    public async Task ExtractAsync_ReturnsFailed_WhenFetchFails()
    {
        var extractor = new MetadataExtractor(new StubFetcher(null));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal(MetadataStatus.Failed, result.Status);
        Assert.Null(result.Title);
        Assert.Null(result.Description);
        Assert.Null(result.ImageUrl);
    }

    [Fact]
    public async Task ExtractAsync_ReturnsSkipped_WhenPageHasNoUsableMetadata()
    {
        var extractor = new MetadataExtractor(new StubFetcher("<html><head></head><body>hi</body></html>"));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal(MetadataStatus.Skipped, result.Status);
    }

    [Fact]
    public async Task ExtractAsync_ParsesOpenGraphTags()
    {
        const string html = """
            <html><head>
            <meta property="og:title" content="Open Graph Title" />
            <meta property="og:description" content="Open Graph Description" />
            <meta property="og:image" content="https://example.com/image.png" />
            </head><body>ignored</body></html>
            """;

        var extractor = new MetadataExtractor(new StubFetcher(html));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal(MetadataStatus.Success, result.Status);
        Assert.Equal("Open Graph Title", result.Title);
        Assert.Equal("Open Graph Description", result.Description);
        Assert.Equal("https://example.com/image.png", result.ImageUrl);
    }

    [Fact]
    public async Task ExtractAsync_FallsBackToTwitterCardThenTitleTag()
    {
        const string html = """
            <html><head>
            <meta name="twitter:title" content="Twitter Title" />
            <title>Plain Title</title>
            </head></html>
            """;

        var extractor = new MetadataExtractor(new StubFetcher(html));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal("Twitter Title", result.Title);
    }

    [Fact]
    public async Task ExtractAsync_UsesTitleTagWhenNoMetaTags()
    {
        const string html = "<html><head><title>  Fallback   Title  </title></head></html>";

        var extractor = new MetadataExtractor(new StubFetcher(html));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal("Fallback Title", result.Title);
    }

    [Fact]
    public async Task ExtractAsync_DecodesHtmlEntities()
    {
        const string html = """
            <html><head><meta property="og:title" content="Tom &amp; Jerry &lt;3" /></head></html>
            """;

        var extractor = new MetadataExtractor(new StubFetcher(html));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal("Tom & Jerry <3", result.Title);
    }

    [Fact]
    public async Task ExtractAsync_StripsResidualMarkup()
    {
        const string html = """
            <html><head><meta property="og:title" content="<script>alert(1)</script>Real Title" /></head></html>
            """;

        var extractor = new MetadataExtractor(new StubFetcher(html));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.DoesNotContain("<script>", result.Title);
        Assert.Contains("Real Title", result.Title);
    }

    [Fact]
    public async Task ExtractAsync_CapsTitleLength()
    {
        var longTitle = new string('a', 900);
        var html = $"<html><head><meta property=\"og:title\" content=\"{longTitle}\" /></head></html>";

        var extractor = new MetadataExtractor(new StubFetcher(html));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Equal(512, result.Title!.Length);
    }

    [Fact]
    public async Task ExtractAsync_HandlesEmptyContent()
    {
        var extractor = new MetadataExtractor(new StubFetcher("<html><head></head><body></body></html>"));
        var result = await extractor.ExtractAsync("https://example.com");

        Assert.Null(result.Title);
        Assert.Null(result.Description);
    }
}
