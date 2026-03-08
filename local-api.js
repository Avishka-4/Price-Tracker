// ---------------------------------------------------------------------------
// Local mock API server — simulates the Lambda API for local development.
// Run with: node local-api.js
// ---------------------------------------------------------------------------
const http = require("http");

const PORT = 3001;

// In-memory store (resets on restart)
const products = new Map();
const history = new Map();

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;

  // CORS preflight
  if (method === "OPTIONS") return json(res, 200, {});

  // GET /products — list all
  if (method === "GET" && path === "/products") {
    return json(res, 200, Array.from(products.values()));
  }

  // POST /products — add
  if (method === "POST" && path === "/products") {
    const body = JSON.parse(await readBody(req));
    const productUrl = body.url;
    if (!productUrl) return json(res, 400, { error: "Missing 'url'" });

    try { new URL(productUrl); } catch { return json(res, 400, { error: "Invalid URL" }); }

    const now = new Date().toISOString();
    // Simulate a random price for demo purposes
    const fakePrice = +(Math.random() * 200 + 10).toFixed(2);

    const item = {
      productUrl,
      currentPrice: fakePrice,
      createdAt: now,
      updatedAt: now,
    };
    products.set(productUrl, item);

    // Seed a few history points so the history table has data
    const hist = [];
    for (let i = 4; i >= 0; i--) {
      const ts = new Date(Date.now() - i * 6 * 60 * 60 * 1000).toISOString();
      const price = +(fakePrice + (Math.random() - 0.5) * 20).toFixed(2);
      hist.push({ timestamp: ts, price });
    }
    history.set(productUrl, hist);

    return json(res, 201, item);
  }

  // DELETE /products/:url
  if (method === "DELETE" && path.startsWith("/products/") && !path.endsWith("/history")) {
    const encoded = path.replace("/products/", "");
    const productUrl = decodeURIComponent(encoded);
    products.delete(productUrl);
    history.delete(productUrl);
    return json(res, 200, { deleted: productUrl });
  }

  // GET /products/:url/history
  if (method === "GET" && path.endsWith("/history")) {
    const encoded = path.replace("/products/", "").replace("/history", "");
    const productUrl = decodeURIComponent(encoded);
    return json(res, 200, history.get(productUrl) ?? []);
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  console.log(`\n  Mock API running at http://localhost:${PORT}\n`);
});
