#!/usr/bin/env node

/**
 * CORS proxy for the Minerva backend.
 *
 * The real backend (https://uc-vortex.dev.ucframework.pt) only sends CORS
 * headers to an allowlist of origins (currently just http://localhost:8080).
 * Any page served from another origin gets its requests blocked by the
 * browser. This proxy forwards /api/* to the backend and answers with
 * permissive CORS headers, so any local origin can talk to it.
 *
 * Zero dependencies. Run: `node dev-server/proxy-server.js` (Node 18+).
 *
 *   PORT                 proxy port (default 8789)
 *   MINERVA_API_URL      upstream base URL
 *                        (default https://uc-vortex.dev.ucframework.pt)
 *
 * Point the widget at it with:
 *   window.MINERVA_API_URL = "http://localhost:8789";
 * or
 *   window.minervaAgent.init({ apiUrl: "http://localhost:8789" });
 */

import http from "http";

const PORT = Number(process.env.PORT || 8789);
const TARGET = (
  process.env.MINERVA_API_URL || "https://uc-vortex.dev.ucframework.pt"
).replace(/\/+$/, "");

function corsHeaders(req) {
  return {
    "Access-Control-Allow-Origin": req.headers.origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const server = http.createServer(async (req, res) => {
  const t0 = Date.now();
  const cors = corsHeaders(req);

  if (req.method === "OPTIONS") {
    res.writeHead(204, cors);
    res.end();
    log(req, 204, t0);
    return;
  }

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);

    const upstream = await fetch(TARGET + req.url, {
      method: req.method,
      headers: req.headers["content-type"]
        ? { "Content-Type": req.headers["content-type"] }
        : {},
      body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
    });

    const payload = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "Content-Type":
        upstream.headers.get("content-type") || "application/json",
      ...cors,
    });
    res.end(payload);
    log(req, upstream.status, t0);
  } catch (err) {
    res.writeHead(502, { "Content-Type": "application/json", ...cors });
    res.end(
      JSON.stringify({
        error: { code: "proxy_error", message: err.message },
      }),
    );
    log(req, 502, t0, err.message);
  }
});

function log(req, status, t0, extra = "") {
  const ms = Date.now() - t0;
  const timestamp = new Date().toISOString();
  process.stdout.write(
    `${timestamp} ${req.method} ${req.url} → ${status} (${ms}ms)${extra ? " " + extra : ""}\n`,
  );
}

server.listen(PORT, () => {
  console.log(`🔀 Minerva CORS proxy listening on http://localhost:${PORT}`);
  console.log(`   forwarding to ${TARGET}`);
});
