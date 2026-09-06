import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function worker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${Math.random()}`);
  return (await import(workerUrl.href)).default;
}

const environment = {
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
};

const context = { waitUntil() {}, passThroughOnException() {} };

test("server-renders the W8R investor demonstration", async () => {
  const app = await worker();
  const response = await app.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), environment, context);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>W8R — How can we serve you better\?<\/title>/i);
  assert.match(html, /Investor journey/);
  assert.match(html, /One transaction\. Every proof point\./);
  assert.match(html, /Interactive proof/i);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("the product surface includes the complete diligence journey", async () => {
  const source = await readFile(new URL("../app/w8r-platform.tsx", import.meta.url), "utf8");
  for (const capability of [
    "BTLR migration",
    "Merchant identity",
    "30-second quote",
    "Receipt vault",
    "Resale & escrow",
    "Reconciliation",
    "Protection centre",
    "Partners & resilience",
    "Investor proof",
    "accessible payment link",
  ]) assert.match(source, new RegExp(capability.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.match(source, /No real funds/);
  assert.match(source, /licensed partners/i);
});

test("the demo API validates and isolates persisted state", async () => {
  const source = await readFile(new URL("../app/api/demo/route.ts", import.meta.url), "utf8");
  assert.match(source, /STATE_KEYS = new Set/);
  assert.match(source, /raw\.length > 20_000/);
  assert.match(source, /status: 413/);
  assert.match(source, /status: 422/);
  assert.match(source, /user\?\.userId \?\? "local-investor-demo"/);
  assert.match(source, /auditEvents/);
});
