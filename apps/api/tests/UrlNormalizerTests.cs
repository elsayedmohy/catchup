using api.Services;

namespace Catchup.Api.Tests;

public class UrlNormalizerTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not a url")]
    [InlineData("javascript:alert(1)")]
    [InlineData("file:///etc/passwd")]
    [InlineData("data:text/html,<h1>hi</h1>")]
    [InlineData("ftp://example.com/file")]
    public void Normalize_ReturnsNull_ForInvalidInput(string? url)
    {
        Assert.Null(UrlNormalizer.Normalize(url));
    }

    [Theory]
    [InlineData("https://example.com/a", "https://example.com/a")]
    [InlineData("https://example.com/a/", "https://example.com/a")]
    [InlineData("https://example.com", "https://example.com/")]
    [InlineData("https://EXAMPLE.com/A", "https://example.com/A")]
    [InlineData("http://example.com/a", "http://example.com/a")]
    public void Normalize_ProducesStableForm(string input, string expected)
    {
        Assert.Equal(expected, UrlNormalizer.Normalize(input));
    }

    [Fact]
    public void Normalize_StripsWwwPrefix()
    {
        Assert.Equal("https://example.com/x", UrlNormalizer.Normalize("https://www.example.com/x"));
    }

    [Fact]
    public void Normalize_StripsTrackingParameters()
    {
        var result = UrlNormalizer.Normalize("https://example.com/p?utm_source=twitter&utm_medium=social&id=42");
        Assert.Equal("https://example.com/p?id=42", result);
    }

    [Fact]
    public void Normalize_KeepsMeaningfulQueryParameters()
    {
        var result = UrlNormalizer.Normalize("https://youtube.com/watch?v=abc123&t=30");
        Assert.Contains("v=abc123", result);
        Assert.Contains("t=30", result);
    }

    [Fact]
    public void Normalize_TreatsTrackedAndUntrackedUrlAsDuplicate()
    {
        var a = UrlNormalizer.Normalize("https://example.com/post?utm_campaign=x");
        var b = UrlNormalizer.Normalize("https://www.example.com/post/");
        Assert.Equal(a, b);
    }

    [Fact]
    public void Normalize_SortsRemainingQueryParameters()
    {
        var a = UrlNormalizer.Normalize("https://example.com/p?b=2&a=1");
        var b = UrlNormalizer.Normalize("https://example.com/p?a=1&b=2");
        Assert.Equal(a, b);
    }

    [Fact]
    public void Normalize_DoesNotCollapseDistinctPaths()
    {
        var a = UrlNormalizer.Normalize("https://example.com/post/1");
        var b = UrlNormalizer.Normalize("https://example.com/post/2");
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void Normalize_PreservesNonDefaultPort()
    {
        Assert.Equal("https://example.com:8443/x", UrlNormalizer.Normalize("https://example.com:8443/x"));
    }

    [Theory]
    [InlineData("https://instagram.com/p/abc", "Instagram")]
    [InlineData("https://www.tiktok.com/@user/video/1", "TikTok")]
    [InlineData("https://youtu.be/abc", "YouTube")]
    [InlineData("https://x.com/user/status/1", "X")]
    [InlineData("https://medium.com/some-article", "Medium")]
    public void InferSource_KnownHosts(string url, string expected)
    {
        Assert.Equal(expected, UrlNormalizer.InferSource(url));
    }

    [Fact]
    public void InferSource_ReturnsNull_ForUnknownHost()
    {
        Assert.Null(UrlNormalizer.InferSource("https://some-random-blog.example/post"));
    }

    [Fact]
    public void InferSource_ReturnsNull_ForInvalidUrl()
    {
        Assert.Null(UrlNormalizer.InferSource("not a url"));
    }
}
