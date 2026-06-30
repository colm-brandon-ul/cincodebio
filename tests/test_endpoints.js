#!/usr/bin/env node
/**
 * CincoDeBio Endpoint Tests (JavaScript / Node.js)
 *
 * Usage:
 *   node test_endpoints.js
 *
 * Requires port-forwards:
 *   kubectl port-forward svc/sib-manager 8081:80 &
 *   kubectl port-forward svc/execution-api 8082:80 &
 *   kubectl port-forward svc/service-api 8084:80 &
 */

const SIB_MANAGER = process.env.SIB_MANAGER_URL || "http://localhost:8081";
const EXECUTION_API = process.env.EXECUTION_API_URL || "http://localhost:8082";
const SERVICE_API = process.env.SERVICE_API_URL || "http://localhost:8084";
const crypto = require("crypto");

let passed = 0;
let failed = 0;
let sibFilesCache = null;

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  PASS: ${name}`);
  } catch (e) {
    failed++;
    console.log(`  FAIL: ${name} — ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function fetchJSON(url, opts) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000), ...opts });
  return { res, data: await res.json() };
}

// ---- sib-manager ----

async function testSibManagerHealth() {
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/health`);
  assert(res.ok, `status ${res.status}`);
  assert(data.status === "healthy", `unexpected: ${JSON.stringify(data)}`);
}

async function testGetSibMap() {
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/get-sib-map`);
  assert(res.ok, `status ${res.status}`);
  assert(data.concepts, "missing concepts");
  assert(data.inputs, "missing inputs");
  assert(data.outputs, "missing outputs");
  const concepts = Object.keys(data.concepts);
  assert(concepts.length > 0, "no SIBs");
  console.log(`         SIB map: ${concepts.length} concepts, ${Object.keys(data.inputs).length} input defs, ${Object.keys(data.outputs).length} output defs`);
  for (const name of concepts.sort()) {
    const ins = data.inputs[name] || {};
    const outs = data.outputs[name] || {};
    const inTypes = (Array.isArray(ins) ? ins : Object.keys(ins)).map(t => t.includes(":") ? t.split(":")[1] : t);
    const outTypes = (Array.isArray(outs) ? outs : Object.keys(outs)).map(t => t.includes(":") ? t.split(":")[1] : t);
    console.log(`           ${name.padEnd(40)} in=[${inTypes.join(", ")}]  out=[${outTypes.join(", ")}]`);
  }
}

async function testGetInstalledSibs() {
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/get-installed-sibs`);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(data), "expected array");
  assert(data.length > 0, "no installed SIBs");
  assert(data[0].image, "missing image field");
  console.log(`         ${data.length} installed SIBs:`);
  for (const s of data) {
    const schema = s["cincodebio.schema"] || {};
    const name = schema.service_name || "?";
    const stype = (schema.service_type || "?").padEnd(12);
    const concept = schema.abstract_concept || "?";
    console.log(`           ${name.padEnd(40)} type=${stype} concept=${concept}`);
  }
}

async function testGetUninstalledSibs() {
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/get-uninstalled-sibs`);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(data), "expected array");
  console.log(`         ${data.length} uninstalled SIBs`);
}

async function testGetUtdSibFile() {
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/get-utd-sib-file`);
  assert(res.ok, `status ${res.status}`);
  assert(data.file, "missing file key");
  assert(data.file.length > 0, "file is empty");
  console.log(`         UTD sib file: ${data.file.length} characters`);
}

async function fetchMissingSibFiles() {
  if (!sibFilesCache) {
    const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/get-missing-sib-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_ids: [] }),
    });
    assert(res.ok, `status ${res.status}`);
    assert(data.files && Object.keys(data.files).length > 0, `missing or empty files: ${JSON.stringify(data)}`);
    sibFilesCache = data.files;
  }
  return sibFilesCache;
}

async function testGetMissingSibFiles() {
  const files = await fetchMissingSibFiles();
  console.log(`         Missing request returned ${Object.keys(files).length} SIB files`);
}

async function testCheckSibFilesHashesValid() {
  const files = await fetchMissingSibFiles();
  const fileHashes = Object.fromEntries(Object.entries(files).map(([name, content]) => [
    name,
    crypto.createHash("sha256").update(content, "utf8").digest("hex"),
  ]));
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/check-sib-files-hashes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileHashes }),
  });
  assert(res.ok, `status ${res.status}`);
  const hashes = data.hashesValid || {};
  const invalid = Object.entries(hashes).filter(([, status]) => status !== "VALID").map(([name]) => name);
  assert(Object.keys(hashes).length === Object.keys(fileHashes).length, "hash response key count differs");
  assert(invalid.length === 0, `invalid hashes: ${invalid.join(", ")}`);
  console.log(`         Validated hashes for ${Object.keys(hashes).length} SIB files`);
}

async function testGetUtdSibFiles() {
  const files = await fetchMissingSibFiles();
  const requested = Object.keys(files).sort().slice(0, 3);
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/get-utd-sib-files`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_ids: requested }),
  });
  assert(res.ok, `status ${res.status}`);
  const returned = data.files || {};
  assert(requested.every((name) => returned[name]), `missing requested files: ${JSON.stringify(data)}`);
  console.log(`         Retrieved ${Object.keys(returned).length} requested SIB files`);
}

async function testCheckSibFileHashInvalid() {
  const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/check-sib-file-hash`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileHash: "fakehash123" }),
  });
  assert(res.ok, `status ${res.status}`);
  assert(data === "INVALID", `expected INVALID, got ${JSON.stringify(data)}`);
  console.log("         Sent fake hash → correctly returned INVALID");
}

async function testCheckSibFilesHashesEmpty() {
  // Retry once — port-forward can drop after the preceding 500 error
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { res, data } = await fetchJSON(`${SIB_MANAGER}/ext/check-sib-files-hashes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileHashes: {} }),
      });
      assert(res.ok, `status ${res.status}`);
      assert(data.hashesValid !== undefined, `missing hashesValid: ${JSON.stringify(data)}`);
      console.log("         Sent empty hashes → response contains hashesValid");
      return;
    } catch (e) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      throw e;
    }
  }
}

async function testSibManagerState() {
  const res = await fetch(`${SIB_MANAGER}/sib-manager-state`, {
    signal: AbortSignal.timeout(10000),
  });
  assert(res.ok, `status ${res.status}`);
  const data = await res.json();
  const latest = data.latest || [];
  const installed = data.installed || [];
  const rest = data.rest || [];
  console.log(`         State: ${latest.length} latest, ${installed.length} installed, ${rest.length} pending`);
  if (rest.length > 0) {
    console.log(`         Pending: ${rest.join(", ")}`);
  }
}

// ---- execution-api ----

async function testExecutionApiHealth() {
  const { res, data } = await fetchJSON(`${EXECUTION_API}/health`);
  assert(res.ok, `status ${res.status}`);
  assert(data.status === "healthy", `unexpected: ${JSON.stringify(data)}`);
}

async function testGetWorkflows() {
  const { res, data } = await fetchJSON(`${EXECUTION_API}/ext/get-workflows`);
  assert(res.ok, `status ${res.status}`);
  assert(Array.isArray(data), "expected array");
  console.log(`         ${data.length} workflows found`);
  if (data.length > 0) {
    const statuses = {};
    data.forEach(w => { const s = w.status || "unknown"; statuses[s] = (statuses[s] || 0) + 1; });
    const statusStr = Object.entries(statuses).map(([k, v]) => `${v} ${k}`).join(", ");
    console.log(`         Statuses: ${statusStr}`);
    for (const w of data.slice(0, 5)) {
      console.log(`           id=${w.id}  owner=${w.owner || "?"}  status=${w.status || "?"}`);
    }
    if (data.length > 5) {
      console.log(`           ... and ${data.length - 5} more`);
    }
  }
}

async function testSubmitWorkflow() {
  const form = new FormData();
  const blob = new Blob(["InitTMA -> SegArrayTMA"], { type: "text/plain" });
  form.append("model", blob, "test.sibs");

  const res = await fetch(`${EXECUTION_API}/ext/model/submit?v2=false`, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  assert(res.status === 202, `expected 202, got ${res.status}`);
  const data = await res.json().catch(() => ({}));
  console.log("         Submitted: InitTMA -> SegArrayTMA");
  if (data.url) console.log(`         Workflow URL: ${data.url}`);
}

// ---- service-api ----

async function testServiceApiHealth() {
  const { res, data } = await fetchJSON(`${SERVICE_API}/health`);
  assert(res.ok, `status ${res.status}`);
  assert(data.status === "ok" || data.status === "healthy", `unexpected: ${JSON.stringify(data)}`);
}

async function testServiceApiOpenapi() {
  const { res, data } = await fetchJSON(`${SERVICE_API}/openapi.json`);
  assert(res.ok, `status ${res.status}`);
  assert(data.paths, "missing paths");
  const paths = Object.keys(data.paths);
  assert(paths.length > 0, "no paths");
  console.log(`         ${paths.length} endpoints registered:`);
  for (const path of paths.sort()) {
    const methods = Object.keys(data.paths[path]).map(m => m.toUpperCase()).join(", ");
    console.log(`           ${methods.padEnd(6)} ${path}`);
  }
}

// ---- main ----

async function main() {
  console.log("=== sib-manager tests ===");
  await test("health", testSibManagerHealth);
  await test("get-sib-map", testGetSibMap);
  await test("get-installed-sibs", testGetInstalledSibs);
  await test("get-uninstalled-sibs", testGetUninstalledSibs);
  await test("get-utd-sib-file", testGetUtdSibFile);
  await test("get-missing-sib-files", testGetMissingSibFiles);
  await test("check-sib-files-hashes (valid)", testCheckSibFilesHashesValid);
  await test("get-utd-sib-files", testGetUtdSibFiles);
  await test("check-sib-file-hash (invalid)", testCheckSibFileHashInvalid);
  await test("check-sib-files-hashes (empty)", testCheckSibFilesHashesEmpty);
  await test("sib-manager-state", testSibManagerState);

  console.log("\n=== execution-api tests ===");
  await test("health", testExecutionApiHealth);
  await test("get-workflows", testGetWorkflows);
  await test("submit-workflow", testSubmitWorkflow);

  console.log("\n=== service-api tests ===");
  await test("health", testServiceApiHealth);
  await test("openapi spec", testServiceApiOpenapi);

  console.log(`\n${"=".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
