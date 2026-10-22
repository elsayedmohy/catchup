using System.Text.RegularExpressions;
using FluentValidation;

namespace api.Validators;

public static partial class UrlPattern
{
    [GeneratedRegex(@"^https?://[^\s]+$", RegexOptions.IgnoreCase)]
    public static partial Regex HttpUrl();
}

/// <summary>
/// Validates a URL before it is stored. Only http/https are accepted; the URL
/// must be absolute and must not embed credentials.
/// </summary>
public class CreateItemRequestValidator : AbstractValidator<Controllers.CreateItemRequest>
{
    public CreateItemRequestValidator()
    {
        RuleFor(x => x.OriginalUrl)
            .NotEmpty().WithMessage("A URL is required.")
            .Must(BeAcceptableUrl).WithMessage("A valid http or https URL is required.");

        RuleFor(x => x.Title)
            .MaximumLength(512).WithMessage("Title must be 512 characters or fewer.");
    }

    private static bool BeAcceptableUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url))
            return false;

        if (!UrlPattern.HttpUrl().IsMatch(url.Trim()))
            return false;

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var uri))
            return false;

        if (uri.Scheme is not ("http" or "https"))
            return false;

        // Reject embedded credentials (https://user:pass@host)
        return string.IsNullOrEmpty(uri.UserInfo);
    }
}
