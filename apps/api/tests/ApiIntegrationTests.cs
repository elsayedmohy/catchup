using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace Catchup.Api.Tests;

public class ApiIntegrationTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;
    private readonly HttpClient _client;

    public ApiIntegrationTests(ApiFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    private async Task<string> RegisterAndGetTokenAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, password = "IntegrationTest123!" });

        response.EnsureSuccessStatusCode();

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("accessToken").GetString()!;
    }

    private HttpClient Authenticated(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    [Fact]
    public async Task Register_CreatesUser_AndReturnsToken()
    {
        var email = $"reg_{Guid.NewGuid()}@example.com";
        var response = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, password = "IntegrationTest123!" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(email, doc.RootElement.GetProperty("user").GetProperty("email").GetString());
        Assert.True(doc.RootElement.GetProperty("accessToken").GetString()!.Length > 0);
    }

    [Fact]
    public async Task Register_WithExistingEmail_ReturnsConflict()
    {
        var email = $"dup_{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "IntegrationTest123!" });

        var second = await _client.PostAsJsonAsync("/api/auth/register",
            new { email, password = "IntegrationTest123!" });

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        var email = $"login_{Guid.NewGuid()}@example.com";
        await _client.PostAsJsonAsync("/api/auth/register", new { email, password = "IntegrationTest123!" });

        var response = await _client.PostAsJsonAsync("/api/auth/login",
            new { email, password = "DefinitelyWrong123!" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ListItems_WithoutToken_ReturnsUnauthorized()
    {
        var response = await _client.GetAsync("/api/items");
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_StoresItem_AndIsIdempotentForDuplicates()
    {
        var token = await RegisterAndGetTokenAsync($"item_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        var first = await client.PostAsJsonAsync("/api/items",
            new { originalUrl = "https://example.com/unique-article" });

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);

        var firstJson = await first.Content.ReadAsStringAsync();
        using var firstDoc = JsonDocument.Parse(firstJson);
        var firstId = firstDoc.RootElement.GetProperty("id").GetString();

        // Same URL, different tracking params -> still a duplicate
        var second = await client.PostAsJsonAsync("/api/items",
            new { originalUrl = "https://www.example.com/unique-article/?utm_source=twitter" });

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);

        var secondJson = await second.Content.ReadAsStringAsync();
        using var secondDoc = JsonDocument.Parse(secondJson);
        Assert.Equal(firstId, secondDoc.RootElement.GetProperty("id").GetString());
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("file:///etc/passwd")]
    [InlineData("data:text/html,<h1>x</h1>")]
    [InlineData("not-a-url")]
    public async Task CreateItem_WithInvalidUrl_ReturnsBadRequest(string url)
    {
        var token = await RegisterAndGetTokenAsync($"invalid_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        var response = await client.PostAsJsonAsync("/api/items", new { originalUrl = url });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task CreateItem_WhenMetadataFails_StillStoresTheUrl()
    {
        var token = await RegisterAndGetTokenAsync($"nometa_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        var response = await client.PostAsJsonAsync("/api/items",
            new { originalUrl = "https://example.com/no-metadata-here" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        Assert.Equal("https://example.com/no-metadata-here", root.GetProperty("originalUrl").GetString());
        Assert.Equal("Failed", root.GetProperty("metadataStatus").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("title").ValueKind);
    }

    [Fact]
    public async Task Search_MatchesTitleAndUrl()
    {
        var token = await RegisterAndGetTokenAsync($"search_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        await client.PostAsJsonAsync("/api/items", new { originalUrl = "https://example.com/searchable-page" });

        var byUrl = await client.GetAsync("/api/items?q=searchable-page");
        var byUrlJson = await byUrl.Content.ReadAsStringAsync();
        using var byUrlDoc = JsonDocument.Parse(byUrlJson);
        Assert.True(byUrlDoc.RootElement.GetProperty("items").GetArrayLength() >= 1);

        var noMatch = await client.GetAsync("/api/items?q=zzzdefinitelynotpresentzzz");
        var noMatchJson = await noMatch.Content.ReadAsStringAsync();
        using var noMatchDoc = JsonDocument.Parse(noMatchJson);
        Assert.Equal(0, noMatchDoc.RootElement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task Archive_RemovesFromInbox_AndRestoreBringsItBack()
    {
        var token = await RegisterAndGetTokenAsync($"archive_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        var created = await client.PostAsJsonAsync("/api/items",
            new { originalUrl = $"https://example.com/archive-{Guid.NewGuid()}" });
        var createdJson = await created.Content.ReadAsStringAsync();
        using var createdDoc = JsonDocument.Parse(createdJson);
        var id = createdDoc.RootElement.GetProperty("id").GetString()!;

        var archived = await client.PutAsync($"/api/items/{id}/archive", null);
        Assert.Equal(HttpStatusCode.OK, archived.StatusCode);

        var inbox = await client.GetAsync("/api/items");
        var inboxJson = await inbox.Content.ReadAsStringAsync();
        using (var inboxDoc = JsonDocument.Parse(inboxJson))
        {
            foreach (var item in inboxDoc.RootElement.GetProperty("items").EnumerateArray())
            {
                Assert.NotEqual(id, item.GetProperty("id").GetString());
            }
        }

        var archiveList = await client.GetAsync("/api/items?archived=true");
        var archiveJson = await archiveList.Content.ReadAsStringAsync();
        using var archiveDoc = JsonDocument.Parse(archiveJson);
        Assert.Contains(archiveDoc.RootElement.GetProperty("items").EnumerateArray(),
            i => i.GetProperty("id").GetString() == id);

        var restored = await client.PutAsync($"/api/items/{id}/restore", null);
        Assert.Equal(HttpStatusCode.OK, restored.StatusCode);

        var inbox2 = await client.GetAsync("/api/items");
        var inbox2Json = await inbox2.Content.ReadAsStringAsync();
        using var inbox2Doc = JsonDocument.Parse(inbox2Json);
        Assert.Contains(inbox2Doc.RootElement.GetProperty("items").EnumerateArray(),
            i => i.GetProperty("id").GetString() == id);
    }

    [Fact]
    public async Task OtherUser_CannotReadArchiveOrDeleteItem()
    {
        var ownerToken = await RegisterAndGetTokenAsync($"owner_{Guid.NewGuid()}@example.com");
        var ownerClient = Authenticated(ownerToken);

        var created = await ownerClient.PostAsJsonAsync("/api/items",
            new { originalUrl = $"https://example.com/private-{Guid.NewGuid()}" });
        var createdJson = await created.Content.ReadAsStringAsync();
        using var createdDoc = JsonDocument.Parse(createdJson);
        var id = createdDoc.RootElement.GetProperty("id").GetString()!;

        var otherToken = await RegisterAndGetTokenAsync($"other_{Guid.NewGuid()}@example.com");
        var otherClient = Authenticated(otherToken);

        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.GetAsync($"/api/items/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.DeleteAsync($"/api/items/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.PutAsync($"/api/items/{id}/archive", null)).StatusCode);

        var otherItems = await otherClient.GetAsync("/api/items");
        var otherJson = await otherItems.Content.ReadAsStringAsync();
        using var otherDoc = JsonDocument.Parse(otherJson);
        Assert.Equal(0, otherDoc.RootElement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task DeleteItem_RemovesIt()
    {
        var token = await RegisterAndGetTokenAsync($"del_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        var created = await client.PostAsJsonAsync("/api/items",
            new { originalUrl = $"https://example.com/todelete-{Guid.NewGuid()}" });
        var createdJson = await created.Content.ReadAsStringAsync();
        using var createdDoc = JsonDocument.Parse(createdJson);
        var id = createdDoc.RootElement.GetProperty("id").GetString()!;

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/items/{id}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/items/{id}")).StatusCode);
    }

    [Fact]
    public async Task DeleteAccount_RemovesAllItems_AndInvalidatesToken()
    {
        var token = await RegisterAndGetTokenAsync($"acct_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        await client.PostAsJsonAsync("/api/items", new { originalUrl = $"https://example.com/a1-{Guid.NewGuid()}" });
        await client.PostAsJsonAsync("/api/items", new { originalUrl = $"https://example.com/a2-{Guid.NewGuid()}" });

        var me = await client.GetAsync("/api/user/me");
        Assert.Equal(HttpStatusCode.OK, me.StatusCode);

        var deleted = await client.DeleteAsync("/api/user/me");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        // The outstanding access token must stop working immediately
        var after = await client.GetAsync("/api/items");
        Assert.Equal(HttpStatusCode.Unauthorized, after.StatusCode);
    }

    [Fact]
    public async Task ListItems_Paginates()
    {
        var token = await RegisterAndGetTokenAsync($"page_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        for (var i = 0; i < 5; i++)
        {
            await client.PostAsJsonAsync("/api/items", new { originalUrl = $"https://example.com/p{i}-{Guid.NewGuid()}" });
        }

        var first = await client.GetAsync("/api/items?limit=2");
        var firstJson = await first.Content.ReadAsStringAsync();
        using var firstDoc = JsonDocument.Parse(firstJson);

        Assert.Equal(2, firstDoc.RootElement.GetProperty("items").GetArrayLength());
        Assert.True(firstDoc.RootElement.GetProperty("hasMore").GetBoolean());
        Assert.NotEqual(JsonValueKind.Null, firstDoc.RootElement.GetProperty("nextCursor").ValueKind);

        var cursor = firstDoc.RootElement.GetProperty("nextCursor").GetString();
        var second = await client.GetAsync($"/api/items?limit=2&cursor={cursor}");
        var secondJson = await second.Content.ReadAsStringAsync();
        using var secondDoc = JsonDocument.Parse(secondJson);

        var firstIds = firstDoc.RootElement.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("id").GetString()).ToList();
        var secondIds = secondDoc.RootElement.GetProperty("items").EnumerateArray()
            .Select(i => i.GetProperty("id").GetString()).ToList();

        Assert.Empty(firstIds.Intersect(secondIds));
    }

    [Fact]
    public async Task ListItems_WithUnknownCursor_ReturnsEmptyPage()
    {
        var token = await RegisterAndGetTokenAsync($"badcursor_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        await client.PostAsJsonAsync("/api/items", new { originalUrl = $"https://example.com/bc-{Guid.NewGuid()}" });

        var response = await client.GetAsync($"/api/items?cursor={Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(0, doc.RootElement.GetProperty("items").GetArrayLength());
        Assert.False(doc.RootElement.GetProperty("hasMore").GetBoolean());
    }

    [Fact]
    public async Task ListItems_WithOtherUsersCursor_ReturnsEmptyPage()
    {
        var ownerToken = await RegisterAndGetTokenAsync($"cur_owner_{Guid.NewGuid()}@example.com");
        var ownerClient = Authenticated(ownerToken);

        var created = await ownerClient.PostAsJsonAsync("/api/items",
            new { originalUrl = $"https://example.com/cur-{Guid.NewGuid()}" });
        var createdJson = await created.Content.ReadAsStringAsync();
        using var createdDoc = JsonDocument.Parse(createdJson);
        var foreignId = createdDoc.RootElement.GetProperty("id").GetString()!;

        var otherToken = await RegisterAndGetTokenAsync($"cur_other_{Guid.NewGuid()}@example.com");
        var otherClient = Authenticated(otherToken);
        await otherClient.PostAsJsonAsync("/api/items", new { originalUrl = $"https://example.com/cur-o-{Guid.NewGuid()}" });

        var response = await otherClient.GetAsync($"/api/items?cursor={foreignId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(0, doc.RootElement.GetProperty("items").GetArrayLength());
    }

    [Fact]
    public async Task FilterBySource_ReturnsOnlyMatchingItems()
    {
        var token = await RegisterAndGetTokenAsync($"src_{Guid.NewGuid()}@example.com");
        var client = Authenticated(token);

        await client.PostAsJsonAsync("/api/items", new { originalUrl = "https://instagram.com/p/test-source-1" });
        await client.PostAsJsonAsync("/api/items", new { originalUrl = "https://example.com/other-source" });

        var filtered = await client.GetAsync("/api/items?source=Instagram");
        var filteredJson = await filtered.Content.ReadAsStringAsync();
        using var filteredDoc = JsonDocument.Parse(filteredJson);

        var items = filteredDoc.RootElement.GetProperty("items").EnumerateArray().ToList();
        Assert.NotEmpty(items);
        Assert.All(items, i => Assert.Equal("Instagram", i.GetProperty("source").GetString()));
    }
}
