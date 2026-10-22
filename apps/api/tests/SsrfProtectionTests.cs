using System.Net;
using api.Services;

namespace Catchup.Api.Tests;

public class SsrfProtectionTests
{
    [Theory]
    [InlineData("127.0.0.1")]        // loopback
    [InlineData("127.255.255.254")]  // loopback range
    [InlineData("10.0.0.1")]         // private class A
    [InlineData("10.255.255.255")]   // private class A
    [InlineData("172.16.0.1")]       // private class B
    [InlineData("172.31.255.255")]   // private class B
    [InlineData("192.168.1.1")]      // private class C
    [InlineData("169.254.169.254")]  // link-local + AWS metadata endpoint
    [InlineData("0.0.0.0")]          // unspecified
    [InlineData("100.64.0.1")]       // CGNAT
    [InlineData("192.0.0.1")]        // IETF protocol assignments
    [InlineData("198.18.0.1")]       // benchmarking
    [InlineData("224.0.0.1")]        // multicast
    [InlineData("255.255.255.255")]  // broadcast
    public void IsPublicAddress_BlocksInternalDestinations(string ip)
    {
        Assert.False(SafeHttpFetcher.IsPublicAddress(IPAddress.Parse(ip)));
    }

    [Theory]
    [InlineData("8.8.8.8")]
    [InlineData("1.1.1.1")]
    [InlineData("93.184.216.34")]
    [InlineData("172.32.0.1")]   // just outside 172.16.0.0/12
    [InlineData("172.15.255.255")]
    public void IsPublicAddress_AllowsPublicDestinations(string ip)
    {
        Assert.True(SafeHttpFetcher.IsPublicAddress(IPAddress.Parse(ip)));
    }

    [Theory]
    [InlineData("::1")]                 // loopback
    [InlineData("fe80::1")]             // link-local
    [InlineData("fc00::1")]             // unique local
    [InlineData("fd12:3456::1")]        // unique local
    [InlineData("ff02::1")]             // multicast
    public void IsPublicAddress_BlocksInternalIpv6(string ip)
    {
        Assert.False(SafeHttpFetcher.IsPublicAddress(IPAddress.Parse(ip)));
    }

    [Fact]
    public void IsPublicAddress_BlocksIpv4MappedLoopback()
    {
        // ::ffff:127.0.0.1 maps back to a blocked IPv4 loopback
        Assert.False(SafeHttpFetcher.IsPublicAddress(IPAddress.Parse("::ffff:127.0.0.1")));
    }

    [Fact]
    public void IsPublicAddress_AllowsIpv4MappedPublic()
    {
        Assert.True(SafeHttpFetcher.IsPublicAddress(IPAddress.Parse("::ffff:8.8.8.8")));
    }

    [Fact]
    public void IsPublicAddress_AllowsPublicIpv6()
    {
        Assert.True(SafeHttpFetcher.IsPublicAddress(IPAddress.Parse("2606:4700:4700::1111")));
    }
}
