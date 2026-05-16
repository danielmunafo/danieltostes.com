#!/usr/bin/env node
/**
 * Local HTTP server for the recruiter assistant API (same handler logic as Lambda).
 * Run after `npm run build` from services/recruiter-assistant-api.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { loadServiceEnvFiles } from "./load-local-env.mjs";

loadServiceEnvFiles();

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { handleChatRequest } = require(join(__dirname, "../dist/index.cjs"));

const port = Number(process.env.PORT ?? 3001);

createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const url = req.url ?? "/";
  const isHealthPath = url === "/health" || url === "/health/";
  if (isHealthPath && (method === "GET" || method === "HEAD")) {
    res.writeHead(200, { "content-type": "application/json" });
    if (method === "GET") {
      res.end(JSON.stringify({ ok: true }));
    } else {
      res.end();
    }
    return;
  }

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks).toString("utf8");
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      headers[k] = Array.isArray(v) ? v.join(",") : (v ?? "");
    }
    const event = {
      requestContext: {
        http: { method: req.method ?? "GET", sourceIp: "127.0.0.1" },
      },
      headers,
      body,
      isBase64Encoded: false,
    };
    const webResponse = await handleChatRequest(event);
    const outHeaders = {};
    webResponse.headers.forEach((value, key) => {
      outHeaders[key] = value;
    });
    res.writeHead(webResponse.status, outHeaders);
    if (webResponse.body) {
      const reader = webResponse.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value?.byteLength) res.write(Buffer.from(value));
      }
      reader.releaseLock();
    }
    res.end();
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        scope: "dev-server",
        msg: "request failed",
        err:
          err instanceof Error
            ? { message: err.message, stack: err.stack }
            : err,
      })
    );
    if (!res.headersSent) {
      res.writeHead(500, { "content-type": "application/json" });
    }
    res.end(JSON.stringify({ error: "internal" }));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`recruiter-assistant-api dev http://127.0.0.1:${port}`);
});
