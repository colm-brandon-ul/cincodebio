import { test, expect, request as playwrightRequest } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Peer-reviewer journey: build a Tissue-Micro-Array workflow ENTIRELY through the GUI —
 * dropping SIBs from the palette onto the canvas and wiring control-flow + data-flow edges —
 * then generate/execute it and inspect the result. Recorded with video.
 *
 * The SIBs are dynamically provided by the backend (sib-manager). After "Refresh SIB Library"
 * the palette is populated with the real SIBs (InitTMA, SegArrayTMA, ...). Placing one creates a
 * fully prime-referenced, port-initialised SIB; edges are created with the ControlFlow / DataFlow
 * palette tools.
 *
 * Runs against either deployment via env (see final_cinco_de_bio_full_demo.spec.mjs header).
 */

// The #/editor/workspace hash loads the workspace + languages — without it the GLSP diagram and
// palette never initialise (the editor opens with no diagram support).
const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/#/editor/workspace';
const appUrl = (process.env.CINCODEBIO_APP_URL ?? 'http://localhost/app').replace(/\/+$/, '');
const executionApiUrl = (process.env.CINCODEBIO_EXECUTION_API_URL ?? 'http://localhost/execution-api/ext').replace(/\/+$/, '');
const dmApi = (process.env.CINCODEBIO_DATA_MANAGER_URL ?? 'http://localhost/data-manager').replace(/\/+$/, '');
const svcApi = (process.env.CINCODEBIO_SERVICES_API_URL ?? 'http://localhost/services-api').replace(/\/+$/, '');
const runtimeLabel = process.env.CINCODEBIO_RUNTIME_LABEL ?? 'k3s';
const installLog = process.env.CINCODEBIO_INSTALL_LOG ?? '';
const WS = '/editor/workspace';
const modelName = 'PeerReviewDemo';
const FILE = `${WS}/${modelName}.flow`;
const slug = runtimeLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const videoPath = `artifacts/playwright/final-gui-journey-${slug}.webm`;
const tracePath = `artifacts/playwright/final-gui-journey-${slug}-trace.zip`;

// Sample TMA experiment used to drive the interactive SIBs to completion.
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmaTiff = join(repoRoot, 'cellmaps/services/segarray-tma/tests/data/tissue_micro_array/A0.ome.tiff');
const experimentPrefix = 'demo-tma';

// --- TMA dearray pipeline (built entirely via the palette) ---
const SIBS = [
  { name: 'InitTMA', dx: 70, dy: 40 },
  { name: 'SegArrayTMA', dx: 470, dy: 40 },
  { name: 'EditPredictedRoisTMA', dx: 870, dy: 40 },
  { name: 'CropCoresTMA', dx: 270, dy: 330 },
  { name: 'AceDTMA', dx: 670, dy: 330 }
];
const CONTROL_FLOW = [
  ['InitTMA', 'SegArrayTMA'], ['SegArrayTMA', 'EditPredictedRoisTMA'],
  ['EditPredictedRoisTMA', 'CropCoresTMA'], ['CropCoresTMA', 'AceDTMA']
];
// [sourceSib, outputPort, targetSib, inputPort] — every input port must be fed (SibCheck)
const DATA_FLOW = [
  ['InitTMA', 'tissue_micro_array', 'SegArrayTMA', 'tissue_micro_array'],
  ['InitTMA', 'nuclear_stain', 'SegArrayTMA', 'nuclear_stain'],
  ['InitTMA', 'tissue_micro_array', 'EditPredictedRoisTMA', 'tissue_micro_array'],
  ['InitTMA', 'nuclear_stain', 'EditPredictedRoisTMA', 'nuclear_stain'],
  ['SegArrayTMA', 'predicted_rois', 'EditPredictedRoisTMA', 'predicted_rois'],
  ['InitTMA', 'tissue_micro_array', 'CropCoresTMA', 'tissue_micro_array'],
  ['EditPredictedRoisTMA', 'rois', 'CropCoresTMA', 'rois'],
  ['CropCoresTMA', 'dearrayed_tissue_micro_array', 'AceDTMA', 'dearrayed_tissue_micro_array']
];

test.use({ video: 'on', ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 } });

test(`peer-reviewer journey: build TMA workflow via palette + execute (${runtimeLabel})`, async ({ page, context }, testInfo) => {
  test.setTimeout(600_000);
  mkdirSync(dirname(tracePath), { recursive: true });
  // NOTE: tracing is intentionally NOT enabled. With snapshots:true Playwright captures the large
  // GLSP/Theia DOM on every action; over this multi-minute palette build it accumulates to GBs and
  // OOMs the worker (SIGABRT). The recorded video is the deliverable.
  // Bounded diagnostics buffer — only capture errors/warnings (the editor floods debug logs).
  const diagnostics = [];
  const pushDiag = s => { diagnostics.push(String(s).slice(0, 1500)); if (diagnostics.length > 200) diagnostics.splice(0, diagnostics.length - 200); };
  page.on('console', m => { if (/error|warning/i.test(m.type())) pushDiag(`console:${m.type()}:${m.text()}`); });
  page.on('pageerror', e => pushDiag(`pageerror:${e.message}`));
  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  try {
    seedEmpty();

    await test.step('0. upload a sample TMA experiment (so the interactive SIBs can complete)', async () => {
      await uploadExperiment(api);
    });

    await test.step('1. install + open the Cinco editor', async () => {
      // The #/editor/workspace hash can race the Theia boot, leaving the body with
      // `theia-no-open-workspace` (no File menu / no diagram). Reload until the workspace opens.
      for (let attempt = 0; attempt < 4; attempt++) {
        await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
        await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
        const opened = await page.evaluate(() => !document.body.className.includes('theia-no-open-workspace'))
          .catch(() => false);
        if (opened) break;
        await page.waitForTimeout(5_000);
        if (await page.evaluate(() => !document.body.className.includes('theia-no-open-workspace')).catch(() => false)) break;
      }
      await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
      await installGuide(page);
      await showInstallCard(page, runtimeLabel, installLog);
      await page.waitForTimeout(6_000);
      await removeInstallCard(page);
      // maximise the modelling canvas (hide the bottom panel)
      await page.keyboard.press('Meta+j').catch(() => undefined);
      await page.waitForTimeout(800);
      await openDiagram(page);
      await page.waitForTimeout(3_500);
    });

    let canvas;
    await test.step('2a. refresh the SIB library so the palette is populated', async () => {
      await setGuide(page, 'Refresh SIB Library', 'The SIBs are provided dynamically by sib-manager. Refreshing populates the palette with the installed SIBs.');
      canvas = await canvasBox(page);
      await refreshSibLibrary(page, canvas);
      await expect.poll(() => sibCount(), { timeout: 90_000, message: 'waiting for siblib/' }).toBeGreaterThan(0);
      await page.waitForTimeout(2_000);
      // Re-open the diagram so the palette is re-fetched with the freshly-loaded SIB library
      // (on a fresh cluster the palette was first requested before the library existed).
      await openDiagram(page);
      await page.waitForTimeout(4_000);
      await expect(await paletteItem(page, 'InitTMA')).toBeVisible({ timeout: 60_000 });
    });

    await test.step('2b. drop the SIBs from the palette onto the canvas', async () => {
      canvas = await canvasBox(page);
      for (const s of SIBS) {
        await setGuide(page, `Add ${s.name}`, `Drag ${s.name} from the palette onto the canvas — the SIB is created with its prime reference and typed ports.`);
        const ok = await placeSib(page, s.name, canvas.x + s.dx, canvas.y + s.dy);
        expect(ok, `placed ${s.name}`).toBe(true);
        await page.waitForTimeout(900);
      }
    });

    // Build a name -> {id, ports} map from the saved model
    const map = await test.step('2c. wire control-flow + data-flow edges with the palette', async () => {
      const model = readModel();
      const byName = {};
      for (const c of model._containments ?? []) {
        const ports = {};
        for (const p of c._containments ?? []) {
          if (p.type === 'cincodebio:inputport') ports['in:' + p._attributes?.name] = p.id;
          if (p.type === 'cincodebio:outputport') ports['out:' + p._attributes?.name] = p.id;
        }
        byName[c._attributes?.name] = { id: c.id, ports };
      }
      // control flow chain
      for (const [src, tgt] of CONTROL_FLOW) {
        await setGuide(page, 'Control flow', `Connect ${src} → ${tgt} (success branch) with the ControlFlow tool.`);
        const ok = await createControlFlow(page, byName[src].id, byName[tgt].id);
        expect(ok, `control flow ${src}->${tgt}`).toBe(true);
        await page.waitForTimeout(500);
      }
      // data flow
      for (const [src, op, tgt, ip] of DATA_FLOW) {
        await setGuide(page, 'Data flow', `Connect ${src}.${op} → ${tgt}.${ip} with the DataFlow tool.`);
        const sId = byName[src].ports['out:' + op], tId = byName[tgt].ports['in:' + ip];
        const ok = await createDataFlow(page, sId, tId);
        expect(ok, `data flow ${src}.${op}->${tgt}.${ip}`).toBe(true);
        await page.waitForTimeout(400);
      }
      return byName;
    });
    void map;
    await page.keyboard.press('Meta+s').catch(() => undefined);
    await page.waitForTimeout(2_000);

    await test.step('3. generate / execute the workflow', async () => {
      await setGuide(page, 'Generate workflow', 'The editor validates the model (SibCheck / DataFlowCheck / ControlFlowCheck) and submits it to execution-api.');
      // refresh once more so validation has the up-to-date library, then generate
      await refreshSibLibrary(page, await canvasBox(page)).catch(() => undefined);
      await page.waitForTimeout(1_500);
      const spy = await installCommandSpy(page);
      expect(spy.ok, spy.message ?? 'CommandRegistry').toBe(true);
      const before = await getWorkflowIds(api);
      const trig = await triggerGenerate(page);
      expect(trig.ok, trig.message ?? 'trigger generate').toBe(true);
      await page.waitForTimeout(4_000);

      const workflowId = await test.step('confirm submission + the MiniBrowser opens', async () => {
        await expect.poll(
          async () => (await getWorkflowIds(api)).filter(id => !before.includes(id)).length,
          { timeout: 120_000, message: () => `diag:\n${diagnostics.slice(-25).join('\n')}\n\neditor:\n${editorLogs()}` }
        ).toBeGreaterThan(0);
        const id = (await getWorkflowIds(api)).filter(x => !before.includes(x))[0];
        // the generator opens the workflow URL in the in-editor MiniBrowser (simple browser)
        await expect.poll(async () => page.evaluate(() =>
          document.querySelector('.theia-mini-browser, [class*="mini-browser"]') !== null),
          { timeout: 60_000, message: 'MiniBrowser did not open' }).toBe(true);
        return id;
      });

      await test.step('4. drive the interactive SIBs (InitTMA, EditPredictedRoisTMA)', async () => {
        await setGuide(page, 'Initialise TMA', 'Select the uploaded tissue micro array + nuclear stain.');
        const init = await waitForAwaitingJob(workflowId, 'InitTMA', 180_000);
        await postJson(api, `${svcApi}/ext/start/init-tma/submit/${init.id}`,
          { workflow_parameters: { experiment_data_id: experimentPrefix, protein_channel_markers: ['A0'], nuclear_stain: 'A0' } });
        await setGuide(page, 'Edit predicted ROIs', 'Accept the predicted regions of interest.');
        const edit = await waitForAwaitingJob(workflowId, 'EditPredictedRoisTMA', 300_000);
        const rois = await fetchPredictedRois(api, edit.id);
        await postJson(api, `${svcApi}/ext/de-array/edit-predicted-rois-tma/submit/${edit.id}`, { workflow_parameters: { rois } });
      });

      await test.step('5. workflow completes — result shown in the editor MiniBrowser', async () => {
        await setGuide(page, 'Workflow execution', `Workflow ${workflowId} running to completion.`);
        await expect.poll(() => workflowStatus(workflowId),
          { timeout: 300_000, message: 'workflow did not reach completed' }).toMatch(/completed/i);
        // best-effort: wait for the MiniBrowser iframe to render the completed rows for a clean frame
        await expect.poll(async () => {
          for (const f of page.frames()) {
            try { const rows = await f.locator('#wf-state-container li').allInnerTexts(); const done = rows.filter(t => /completed/i.test(t)).length; if (done > 0) return done; } catch { /* not the workflow frame */ }
          }
          return 0;
        }, { timeout: 90_000 }).toBeGreaterThanOrEqual(5).catch(() => undefined);
        await page.waitForTimeout(3_000);
        await page.screenshot({ path: `artifacts/playwright/final-gui-journey-${slug}-result.png`, fullPage: true });
        const jobs = await workflowJobs(workflowId);
        await testInfo.attach('execution-state', { body: jobs.map(j => `${j.service_name}:${j.job_status}`).join('\n'), contentType: 'text/plain' });
        expect(jobs.filter(j => /completed/i.test(j.job_status)).length, 'all SIB jobs completed').toBeGreaterThanOrEqual(5);
      });
    });
  } finally {
    await api.dispose().catch(() => undefined);
    const video = page.video();
    await page.close().catch(() => undefined);
    if (video) {
      const src = await video.path().catch(() => undefined);
      if (src) { mkdirSync(dirname(videoPath), { recursive: true }); copyFileSync(src, videoPath); }
      await testInfo.attach(`gui-journey-${slug}-video`, { path: videoPath, contentType: 'video/webm' }).catch(() => undefined);
    }
  }
});

// ---------- modelling helpers ----------
async function placeSib(page, name, x, y) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const item = await paletteItem(page, name);
    if (!(await item.isVisible({ timeout: 5_000 }).catch(() => false))) return false;
    await item.click();
    await page.waitForTimeout(700);
    await page.mouse.move(x, y, { steps: 10 });
    await page.waitForTimeout(250);
    await page.mouse.click(x, y);
    await page.waitForTimeout(1_700);
    await page.keyboard.press('Meta+s').catch(() => undefined);
    await page.waitForTimeout(1_600);
    if ((readModel()._containments ?? []).some(c => c._attributes?.name === name)) return true;
    await page.keyboard.press('Escape').catch(() => undefined);
  }
  return false;
}

async function createControlFlow(page, srcId, tgtId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = countEdges(/controlflow/i);
    const tool = await paletteItem(page, 'ControlFlow');
    await tool.click();
    await page.waitForTimeout(600);
    const s = await elPos(page, srcId), t = await elPos(page, tgtId);
    if (!s || !t) { await page.keyboard.press('Escape').catch(() => undefined); continue; }
    // click the SIB header strips (above the port rows)
    await page.mouse.click(s.x, s.top + 12);
    await page.waitForTimeout(700);
    await page.mouse.click(t.x, t.top + 12);
    await page.waitForTimeout(1_300);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.keyboard.press('Meta+s').catch(() => undefined);
    await page.waitForTimeout(1_400);
    if (countEdges(/controlflow/i) > before) return true;
  }
  return false;
}

async function createDataFlow(page, srcPortId, tgtPortId) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const before = countEdges(/dataflow/i);
    const tool = await paletteItem(page, 'DataFlow');
    await tool.click();
    await page.waitForTimeout(600);
    const s = await elPos(page, srcPortId), t = await elPos(page, tgtPortId);
    if (!s || !t) { await page.keyboard.press('Escape').catch(() => undefined); continue; }
    await page.mouse.click(s.x, s.y);
    await page.waitForTimeout(700);
    await page.mouse.click(t.x, t.y);
    await page.waitForTimeout(1_300);
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.keyboard.press('Meta+s').catch(() => undefined);
    await page.waitForTimeout(1_400);
    if (countEdges(/dataflow/i) > before) return true;
  }
  return false;
}

async function refreshSibLibrary(page, canvas) {
  // Preferred: dispatch the SyncSibLibraryWithBackEnd CustomAction via the opened diagram's GLSP
  // action dispatcher (robust). The right-click canvas context menu is unreliable on this build.
  if (await triggerCustomAction(page, 'SyncSibLibraryWithBackEnd')) { await page.waitForTimeout(6_000); return; }
  // Fallback: the canvas context menu.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.mouse.click(canvas.x + canvas.w - 30, canvas.y + canvas.h - 30, { button: 'right' });
    const it = page.locator('.p-Menu-itemLabel, .lm-Menu-itemLabel, [role="menuitem"]').filter({ hasText: /Refresh SIB Library/ }).first();
    if (await it.isVisible({ timeout: 1_500 }).catch(() => false)) { await it.click(); await page.waitForTimeout(7_000); return; }
  }
}
async function triggerCustomAction(page, handlerClass) {
  return page.evaluate(hc => {
    const widget = window.__cdbW;
    if (!widget) return false;
    const isC = v => v && typeof v.get === 'function' && v._bindingDictionary;
    const containers = [];
    for (const k of [...Object.keys(widget), 'diContainer', 'container', '_container']) { const v = widget[k]; if (isC(v) && !containers.includes(v)) containers.push(v); }
    for (const c of containers) {
      const d = Array.from(c._bindingDictionary?._map?.entries?.() ?? []).map(([id]) => { try { return c.get(id); } catch { return undefined; } }).find(s => s && typeof s.dispatch === 'function' && typeof s.request === 'function' && /ActionDispatcher/.test(s.constructor?.name ?? ''));
      if (d) { const rootId = widget.editorContext?.modelRoot?.id; if (!rootId || rootId === 'EMPTY') return false; d.dispatch({ kind: 'CustomAction', selectedElementIds: [], modelElementId: rootId, handlerClass: hc, args: {} }); return true; }
    }
    return false;
  }, handlerClass);
}

async function paletteItem(page, name) {
  return page.locator('.tool-button, [class*="tool-button"]').filter({ hasText: new RegExp(name + '$') }).first();
}
async function elPos(page, id) {
  return page.evaluate(eid => {
    const el = document.getElementById(eid) || document.querySelector(`[id$="${eid}"]`) || document.querySelector(`[id*="${eid}"]`);
    if (!el) return null;
    const b = el.getBoundingClientRect();
    return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2), top: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) };
  }, id);
}
async function canvasBox(page) {
  return page.evaluate(() => { const e = document.querySelector('svg.sprotty-graph, .sprotty svg, [class*="sprotty"] svg'); const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; });
}
async function openDiagram(page) {
  const r = await page.evaluate(async p => {
    const c = window.theia?.container;
    const m = Array.from(c?._bindingDictionary?._map?.entries?.() ?? []).map(([id]) => { try { return c.get(id); } catch { return undefined; } }).find(s => s?.constructor?.name === 'CincoGLSPDiagramMananger' && typeof s.doOpen === 'function');
    if (!m) return { ok: false };
    const fn = p.substring(p.lastIndexOf('/') + 1);
    const uri = { scheme: 'file', path: { base: fn, name: fn, ext: '.flow', toString: () => p, fsPath: () => p }, toString: () => `file://${p}`, withPath: x => ({ ...uri, path: x }) };
    const w = await m.createWidget(m.createWidgetOptions(uri, {})); await m.doOpen(w, uri, { mode: 'activate' }); window.__cdbW = w; return { ok: true };
  }, FILE);
  expect(r.ok, 'open diagram').toBe(true);
}
async function triggerGenerate(page) {
  return page.evaluate(ws => {
    const widget = window.__cdbW;
    const isC = v => v && typeof v.get === 'function' && v._bindingDictionary;
    const containers = [];
    for (const k of [...Object.keys(widget), 'diContainer', 'container', '_container']) { const v = widget[k]; if (isC(v) && !containers.includes(v)) containers.push(v); }
    for (const c of containers) {
      const d = Array.from(c._bindingDictionary?._map?.entries?.() ?? []).map(([id]) => { try { return c.get(id); } catch { return undefined; } }).find(s => s && typeof s.dispatch === 'function' && typeof s.request === 'function' && /ActionDispatcher/.test(s.constructor?.name ?? ''));
      if (d) { const rootId = widget.editorContext?.modelRoot?.id; if (!rootId) return { ok: false }; d.dispatch({ kind: 'cincoGenerate', modelElementId: rootId, targetFolder: ws, args: {} }); return { ok: true }; }
    }
    return { ok: false };
  }, WS);
}
async function installCommandSpy(page) {
  return page.evaluate(() => {
    const c = window.theia?.container;
    const reg = Array.from(c?._bindingDictionary?._map?.entries?.() ?? []).map(([id]) => { try { return c.get(id); } catch { return undefined; } }).find(s => s && typeof s.executeCommand === 'function' && typeof s.getCommand === 'function' && Array.isArray(s.commands));
    if (!reg) return { ok: false };
    window.__cdbCmd = []; if (!reg.__w) { const o = reg.executeCommand.bind(reg); reg.executeCommand = (id, ...a) => { try { window.__cdbCmd.push({ id }); } catch { /* */ } return o(id, ...a); }; reg.__w = true; }
    return { ok: true };
  });
}
async function waitForExecution(wf, api, id) {
  const items = wf.locator('#wf-state-container li');
  await expect(wf.locator('#wf-status')).toBeVisible({ timeout: 60_000 }).catch(() => undefined);
  await expect.poll(async () => items.count(), { timeout: 180_000 }).toBeGreaterThan(0).catch(() => undefined);
  await expect.poll(async () => (await items.allTextContents().catch(() => [])).some(x => /awaiting_interaction|processing|completed|failed|accepted|running|submitted/i.test(x)), { timeout: 180_000 }).toBe(true).catch(() => undefined);
  const statusText = (await wf.locator('#wf-status').innerText().catch(() => '')).trim();
  const jobs = (await items.allTextContents().catch(() => [])).map(s => s.trim()).filter(Boolean);
  let backend; try { const r = await api.get(`${executionApiUrl}/get-workflows`); backend = (await r.json()).find(w => (w.id ?? w._id) === id); } catch { /* */ }
  return { workflowId: id, statusText, jobs, backendStatus: backend?.status };
}
async function resultPanel(wf, s) {
  await wf.evaluate(st => { const p = document.createElement('div'); p.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:2147483647;width:560px;max-width:calc(100vw - 48px);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(12,18,22,0.94);color:#eef;font:12px/1.45 monospace;white-space:pre-wrap'; p.textContent = 'WORKFLOW EXECUTION RESULT\n' + JSON.stringify({ workflowId: st.workflowId, backendStatus: st.backendStatus, jobs: st.jobs }, null, 2); document.body.appendChild(p); }, s);
}
async function getWorkflowIds(api) {
  try { const r = await api.get(`${executionApiUrl}/get-workflows`, { timeout: 15_000 }); if (!r.ok()) return []; const b = await r.json(); return Array.isArray(b) ? b.map(w => String(w.id ?? w._id ?? '')).filter(Boolean) : []; } catch { return []; }
}

// ---------- overlay helpers ----------
async function installGuide(page) {
  await page.evaluate(() => { if (document.getElementById('cdb-guide')) return; const p = document.createElement('div'); p.id = 'cdb-guide'; p.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;width:460px;max-width:calc(100vw - 48px);padding:16px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(16,22,27,0.93);color:#f2f7f5;box-shadow:0 18px 60px rgba(0,0,0,.34);font:14px/1.42 "Avenir Next","Trebuchet MS",sans-serif'; p.innerHTML = '<div id="cdb-gt" style="font-size:18px;font-weight:800;margin-bottom:6px"></div><div id="cdb-gb"></div>'; document.body.appendChild(p); });
}
async function setGuide(page, title, body) {
  await page.evaluate(({ title, body }) => { const t = document.getElementById('cdb-gt'); const b = document.getElementById('cdb-gb'); if (t) t.textContent = title; if (b) b.textContent = body; }, { title, body }).catch(() => undefined);
}
async function showInstallCard(page, runtime, log) {
  await page.evaluate(({ runtime, log }) => {
    const p = document.createElement('div'); p.id = 'cdb-install';
    p.style.cssText = 'position:fixed;inset:0;z-index:2147483646;background:#0b0f13;color:#9effa0;font:13px/1.5 SFMono-Regular,Consolas,monospace;padding:40px 56px;white-space:pre-wrap;overflow:hidden';
    const lines = (log || `$ CINCODEBIO_RUNTIME=${runtime} bash install.sh\n[INFO] Building / starting ${runtime}...\n[INFO] Waiting for core services to start...\n[INFO]   all pods Ready\n[INFO] CincoDeBio is ready!`).split('\n').slice(-26).join('\n');
    p.textContent = `CincoDeBio peer-review journey — step 1: install (${runtime})\n\n` + lines + '\n\n[ cluster ready — opening the editor... ]';
    document.body.appendChild(p);
  }, { runtime, log });
}
async function removeInstallCard(page) { await page.evaluate(() => document.getElementById('cdb-install')?.remove()).catch(() => undefined); }

// ---------- editor-pod helpers ----------
function seedEmpty() {
  execPod(`mkdir -p ${q(WS)} && cat > ${q(FILE)}`, JSON.stringify({ id: modelName, type: 'cincodebio:cincodebiographmodel', _attributes: {}, _containments: [], _edges: [] }, null, 2));
  execPod(`rm -rf ${q(WS + '/.siblib')} ${q(WS + '/siblib')} && mkdir -p ${q(WS + '/siblib')}`);
}
function readModel() { try { return JSON.parse(execPod(`cat ${q(FILE)}`)); } catch { return {}; } }
function countEdges(re) { return (readModel()._edges ?? []).filter(e => re.test(e.type ?? '')).length; }
function sibCount() { return Number(execPod(`find ${q(WS + '/siblib')} -type f | wc -l`).trim()); }
function execPod(cmd, input) {
  const pod = execSync(`${kubectlCmd()} get pod -n default -l app=cinco-de-bio-editor -o jsonpath='{.items[0].metadata.name}'`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return execSync(`${kubectlCmd()} exec -i -n default -c cinco-de-bio-editor ${q(pod)} -- sh -lc ${q(cmd)}`, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}
function editorLogs() { try { return execSync(`${kubectlCmd()} logs -n default deploy/cinco-de-bio-editor -c cinco-de-bio-editor --since=4m --tail=200`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return String(e); } }
function kubectlCmd() { const c = process.env.CINCODEBIO_KUBECTL_COMMAND ?? 'docker exec -i cincodebio kubectl'; if (/^docker\s+exec\s+/.test(c) && !/\s-i(\s|$)/.test(c)) return c.replace(/^docker\s+exec\s+/, 'docker exec -i '); return c; }
function q(v) { return `'${String(v).replaceAll("'", "'\\''")}'`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ---------- data upload (data-manager presigned, runtime-agnostic over HTTP) ----------
async function uploadExperiment(api) {
  const tiff = readFileSync(tmaTiff);
  await putPresigned(api, experimentPrefix, 'A0.ome.tiff', 'application/octet-stream', tiff, 'tiff_name');
  await putPresigned(api, experimentPrefix, 'channel_markers.txt', 'text/plain', Buffer.from('A0\n'), 'channel_markers');
}
async function putPresigned(api, prefix, object, contentType, body, fileTag) {
  const urlResp = await api.get(`${dmApi}/ext/get-presigned-upload-url?prefix=${prefix}&object_name=${object}&content_type=${encodeURIComponent(contentType)}`, { timeout: 30_000 });
  expect(urlResp.ok(), `presigned url for ${object}: HTTP ${urlResp.status()}`).toBeTruthy();
  const putUrl = (await urlResp.text()).trim().replace(/^"|"$/g, '');
  const put = await api.fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, data: body, timeout: 120_000 });
  expect(put.status(), `PUT ${object}`).toBeLessThan(400);
  const tag = await api.get(`${dmApi}/ext/add-tags?prefix=${prefix}&object_name=${object}&content_type=${encodeURIComponent(contentType)}&experimental_tag=TMA&file_tag=${fileTag}`, { timeout: 30_000 });
  expect(tag.ok(), `add-tags ${object}`).toBeTruthy();
}

// ---------- interaction driving ----------
async function postJson(api, url, body) {
  const r = await api.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: JSON.stringify(body), timeout: 60_000 });
  expect(r.status(), `POST ${url}`).toBeLessThan(400);
  return r;
}
function mongoEval(js) {
  return execSync(`${kubectlCmd()} exec -i deploy/mongodb -n default -- mongosh workflows --quiet --eval ${q(js)}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function workflowJobs(id) {
  try {
    const raw = mongoEval(`var d=db.flows.findOne({_id:"${id}"}); print(JSON.stringify((d&&d.state)||[]))`);
    return JSON.parse(raw.split('\n').filter(Boolean).pop() ?? '[]');
  } catch { return []; }
}
function workflowStatus(id) {
  try { return (mongoEval(`var d=db.flows.findOne({_id:"${id}"}); print(d?d.status:"none")`).split('\n').pop() || '').trim(); }
  catch { return 'unknown'; }
}
async function waitForAwaitingJob(workflowId, serviceName, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = workflowJobs(workflowId).find(j => j.service_name === serviceName && /awaiting_interaction/i.test(j.job_status));
    if (job) return job;
    await sleep(4000);
  }
  throw new Error(`${serviceName} did not reach awaiting_interaction within ${timeoutMs}ms`);
}
async function fetchPredictedRois(api, jobId) {
  const html = await (await api.get(`${svcApi}/ext/de-array/edit-predicted-rois-tma/frontend/${jobId}`, { timeout: 30_000 })).text();
  const m = html.match(/dataROIs = JSON\.parse\('(.*?)'\)/s);
  if (!m) throw new Error('predicted ROIs not found in edit-rois frontend');
  const data = JSON.parse(JSON.parse(`"${m[1].replace(/"/g, '\\"')}"`));
  return (data[0] && data[0].rois) || [];
}
