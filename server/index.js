import express from "express";
import cors from "cors";

// Imports the CORS middleware to allow cross-origin requests (client on localhost:3000 → server on localhost:4000).
// Browsers block requests made from one origin to another origin for security.

// Example in your case:

// Frontend → http://localhost:3000

// Backend → http://localhost:4000

    // React can send requests to Express
    // Browser will not block it
    // You avoid CORS errors like
    // “Blocked by CORS policy”

import bodyParser from "body-parser";
import QRCode from "qrcode";
import dns from "dns";

//Node's built-in DNS module — used to check whether a domain actually resolves (exists).

const app = express();
app.use(cors()); // Tells Express: “Allow requests from ANY frontend.”

/*
    Registers CORS middleware globally so all incoming requests get CORS headers.
    Tip: You can restrict origins by passing options to cors() (for production).
*/

app.use(bodyParser.json({ limit: "1mb" }));

/*
    Registers JSON body parsing middleware and sets a maximum body size of 1MB.
    Protects against huge payloads; your app only expects a small JSON payload { url: "..." }.
*/

const PORT = 4000;

// DNS lookup
function domainExists(domain) {
  return new Promise((resolve) => {
    dns.lookup(domain, (err) => {
      resolve(!err); // true if domain exists
    });
  });
}

/*
    Without Promise:
        await has nothing to wait for → domain check finishes instantly → wrong result.

    With Promise:
        await waits until DNS lookup actually completes → correct result.

    A Promise is JavaScript’s way of handling asynchronous operations (things that finish later).

    new Promise(...) lets you convert a callback-based function into an await-able function.
*/

function extractDomain(url) {
  try {
    const u = new URL(url);
    return u.hostname;
  } catch {
    return null;
  }
}

/*
    function extractDomain(url) { — helper to pull hostname from a URL string.

    const u = new URL(url); — parses the string into a URL object (throws if invalid).

    return u.hostname; — returns hostname only (no port), e.g., www.google.com.

    catch { return null; } — returns null if input cannot be parsed as a URL.

    Note: Using new URL() expects a full URL like https://example.com. If url lacks protocol, it will throw — you normalize before calling this function.
*/

function normalizeUrl(value) {
  let url = value.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
}

app.post("/api/generate", async (req, res) => {
  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const normalized = normalizeUrl(url);
  const domain = extractDomain(normalized);

  /*
    Normalizes (adds protocol if needed) and extracts the hostname. Example: input google.com → normalized https://google.com → domain google.com.
  */

  if (!domain) {
    return res.status(400).json({ error: "Invalid URL format" });
  }

  // If extractDomain failed (malformed URL), return 400 and an explanatory error.

  // DNS check
  const exists = await domainExists(domain);
  if (!exists) {
    return res.status(400).json({ error: "Domain does not exist" });
  }

  // Performs DNS lookup for the hostname. If DNS lookup fails, return 400 with message Domain does not exist.

  try {
    const dataUrl = await QRCode.toDataURL(normalized, {
      errorCorrectionLevel: "H",
      type: "image/png",
      margin: 1,
      width: 400
    });
    return res.json({ dataUrl });
  } catch (err) {
    return res.status(500).json({ error: "QR generation failed" });
  }
});

/*
    try { ... } catch (err) { ... } — attempts QR generation, returns 500 on failure.

    QRCode.toDataURL(normalized, { ... }) — creates a PNG image encoded as a Data URL (base64). Options:

    errorCorrectionLevel: "H" — high error correction (QR readable even if partially obscured).

    type: "image/png" — output PNG.

    margin: 1 — quiet zone around QR.

    width: 400 — image width in pixels (affects QR module size).

    return res.json({ dataUrl }); — successful response with { dataUrl: "data:image/png;base64,...." }
*/

app.listen(PORT, () => {
  console.log(`QR server running on http://localhost:${PORT}`);
});
