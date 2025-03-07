const dns = require('dns');
const { promisify } = require('util');

// Promisify dns lookup
const dnsLookup = promisify(dns.lookup);

async function testDNSResolution() {
  try {
    console.log("Attempting to resolve hostname...");
    
    // Try different resolution methods
    console.log("Method 1: dns.lookup");
    const lookupResult = await dnsLookup('smartpact.jt9gh.mongodb.net');
    console.log("Lookup Result:", lookupResult);

    console.log("\nMethod 2: dns.resolve4");
    dns.resolve4('smartpact.jt9gh.mongodb.net', (err, addresses) => {
      if (err) {
        console.error("Resolve4 Error:", err);
      } else {
        console.log("Resolve4 Addresses:", addresses);
      }
    });

    console.log("\nMethod 3: Alternate DNS Servers");
    const alternativeDNS = [
      '8.8.8.8',  // Google Public DNS
      '1.1.1.1'   // Cloudflare DNS
    ];

    const resolver = new dns.Resolver();
    resolver.setServers(alternativeDNS);
    
    resolver.resolve4('smartpact.jt9gh.mongodb.net', (err, addresses) => {
      if (err) {
        console.error("Alternative DNS Resolution Error:", err);
      } else {
        console.log("Alternative DNS Addresses:", addresses);
      }
    });

  } catch (error) {
    console.error("Comprehensive DNS Resolution Error:", error);
  }
}

testDNSResolution();