import React, { useState } from "react";

const SERVER_URL = "http://localhost:4000";

const allowedTlds = [
  "com", "net", "org", "in", "io", "app", "tech", "dev", "edu", "gov", "info"
];

// A list of top-level domains (TLDs) that your validation accepts.

function isValidUrl(value) {
  if (!value) return false;

  let url = value.trim();

  // Auto add https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Format validation
  const pattern = /^https?:\/\/(www\.)?([a-zA-Z0-9-]+)\.([a-zA-Z]{2,})$/;
  const match = url.match(pattern);
  if (!match) return false;

  /*
    ^https?:// — starts with http:// or https://

    (www\.)? — optional www.

    ([a-zA-Z0-9-]+) — domain name (letters, numbers, hyphen; at least 1 char)

    \.([a-zA-Z]{2,}) — a dot followed by TLD of 2+ letters

    $ — end of string

    Rejects malformed strings like http:/google or google..

    const match = url.match(pattern); if (!match) return false;

    Runs regex (regular expression) and rejects if it doesn't match the expected format
  */

  // TLD check
  const tld = match[3].toLowerCase();
  if (!allowedTlds.includes(tld)) return false;

  return true;

  /*

    This regex has 3 capturing groups:

    (www\.)? → group 1
    ([a-zA-Z0-9-]+) → group 2 (domain name)
    ([a-zA-Z]{2,}) → group 3 (TLD)
    
    match[0] = "https://www.google.com"   (full match)
    match[1] = "www."                     (group 1)
    match[2] = "google"                   (group 2)
    match[3] = "com"                      (group 3 → TLD)
  */
}

export default function App() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(""); // Base64 data URL returned by server; if set, app displays the QR image.

  async function handleGenerate(e) {
    e.preventDefault(); // prevents the browser’s default form POST and page reload
    setError("");
    setQrDataUrl("");

    if (!input.trim()) {
      setError("Enter a link."); // Basic required-field check; shows message if empty.
      return;
    }

    // Validate before fetch
    if (!isValidUrl(input.trim())) {
      setError("Invalid URL. Use a proper domain like google.com");
      return;
    }

    setLoading(true); // Shows loading state (button disabled / text changed).

    try {
      let finalUrl = input.trim();

      if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }

      // Normalizes input to include protocol before sending to server (keeps server and client consistent).

      const resp = await fetch(`${SERVER_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: finalUrl })
      });

      /*
        Makes a POST request to the backend API with JSON body { url: finalUrl }.
        Server endpoint /api/generate is where QR is generated and returned as a data URL.
      */

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Server error");

      setQrDataUrl(data.dataUrl);
    } catch (err) {
      setError("Failed to generate QR. Try again.");
    } finally {   // finally is ALWAYS executed, no matter what happens in the try or catch.
      setLoading(false);
    }
  }

  /*
    On success stores data.dataUrl so the UI displays the QR.
    server may return 400/500 with { error: "..." }.

  */

  function handleReset() {
    setInput("");
    setError("");
    setQrDataUrl("");
  }

  return (
    <div className="page">
      <div className="card">
        <h1 className="title">QuickQR</h1>

        <form onSubmit={handleGenerate} className="form">
          <label className="label">Enter a link</label>
          <input
            className="input"
            placeholder="https://example.com"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />

          <div className="controls">
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Generating…" : "Generate QR"}
            </button>

           {/* type="submit" triggers the form onSubmit.

            disabled={loading} prevents double submits while waiting. */}

            <button
              className="btn btn-ghost"
              type="button"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        </form>

        {error && <div className="error">{error}</div>}

        {qrDataUrl && (
          <div className="result">
            <img src={qrDataUrl} alt="QR code" className="qr" />
            <div className="download-row">
              <a className="action-btn" href={qrDataUrl} download="qrcode.png">
                Download PNG
              </a>

              {/* <a> is an anchor tag */}

              <button
                className="action-btn"
                onClick={() => navigator.clipboard.writeText(input)}
              >
                Copy link
              </button>

              {/* Copy link button uses the Clipboard API to copy the original input text. */}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
