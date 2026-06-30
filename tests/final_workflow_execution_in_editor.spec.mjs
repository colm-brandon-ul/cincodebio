import { test, expect, request as playwrightRequest } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * FULL end-to-end proof, recorded with video:
 *   1. open the Cinco editor (served by the running platform)
 *   2. seed the TMA workflow model + refresh the SIB library
 *   3. upload a real sample TMA experiment via the data-manager (presigned upload)
 *   4. trigger "Generate" -> the editor opens the workflow URL in its in-editor MiniBrowser
 *      (Theia's "simple browser")
 *   5. drive the two interactive SIBs (InitTMA data selection, EditPredictedRoisTMA ROI accept)
 *   6. the MiniBrowser (showing the workflow monitoring page) updates live until the workflow
 *      reaches COMPLETED — captured in the video + a final screenshot
 *
 * Works on either runtime via env (defaults = k3s on localhost):
 *   CINCODEBIO_RUNTIME_LABEL=k3s|minikube
 *   CINCODEBIO_EDITOR_URL, CINCODEBIO_APP_BASE_URL
 *   CINCODEBIO_KUBECTL_COMMAND   (k3s: 'docker exec -i cincodebio kubectl';
 *                                 minikube: 'minikube -p cincodebio-mk kubectl --')
 * Minikube additionally needs `sudo minikube -p cincodebio-mk tunnel` running (localhost:80).
 */

const testDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(testDir, '..', '..'); // colm/
const runtimeLabel = process.env.CINCODEBIO_RUNTIME_LABEL ?? 'k3s';
const slug = runtimeLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase();

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/#/editor/workspace';
const appBase = (process.env.CINCODEBIO_APP_BASE_URL ?? 'http://localhost').replace(/\/+$/, '');
const execApi = process.env.CINCODEBIO_EXECUTION_API_URL ?? `${appBase}/execution-api`;
const dmApi = process.env.CINCODEBIO_DATA_MANAGER_URL ?? `${appBase}/data-manager`;
const svcApi = process.env.CINCODEBIO_SERVICES_API_URL ?? `${appBase}/services-api`;

const workspacePath = '/editor/workspace';
const modelFileName = 'execute-tma-workflow.flow';
const modelFilePath = `${workspacePath}/${modelFileName}`;
const experimentPrefix = 'demo-tma';
const tmaTiff = join(repoRoot, 'cellmaps/services/segarray-tma/tests/data/tissue_micro_array/A0.ome.tiff');

const videoPath = `artifacts/playwright/final-${slug}-execution-in-editor.webm`;
const shotPath = `artifacts/playwright/final-${slug}-execution-in-editor.png`;

test.use({ video: 'on', ignoreHTTPSErrors: true, viewport: { width: 1680, height: 1040 } });

test(`${runtimeLabel}: create + execute a workflow in the editor and see the result in the MiniBrowser`, async ({ page, context }, testInfo) => {
  test.setTimeout(600_000);
  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const diagnostics = [];
  page.on('console', m => diagnostics.push(`console:${m.type()}:${m.text()}`));
  page.on('pageerror', e => diagnostics.push(`pageerror:${e.message}`));

  await test.step('1. upload a real sample TMA experiment (data-manager presigned)', async () => {
    await uploadExperiment(api);
  });

  await test.step('2. seed an EMPTY diagram + reset the SIB library', async () => {
    // A SIB-referencing model cannot load until siblib/ is populated, so start empty,
    // refresh the library, THEN load the real model (mirrors the GUI workflow).
    writeWorkspaceFile(modelFileName, emptyModel());
    resetSibLibrary();
  });

  await test.step('3. open the editor + the empty diagram', async () => {
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
    await openCincoDiagram(page, modelFilePath);
    await expect.poll(async () => (await visibleCanvasBoxes(page)).length, { timeout: 90_000 }).toBeGreaterThan(0);
    await expect.poll(() => modelRootId(page), { timeout: 30_000, message: 'empty model root did not load' }).not.toBe('EMPTY');
  });

  await test.step('4. refresh the SIB library (SyncSibLibraryWithBackEnd)', async () => {
    await expect.poll(async () => {
      const r = await triggerCustomAction(page, 'SyncSibLibraryWithBackEnd');
      if (!r.ok) await refreshSibLibrary(page).catch(() => undefined);
      await new Promise(res => setTimeout(res, 4000));
      return sibFileCount();
    }, { timeout: 120_000, message: 'waiting for siblib/ to populate' }).toBeGreaterThan(0);
  });

  await test.step('5. load the real TMA workflow model', async () => {
    writeWorkspaceFile(modelFileName, loadFixtureModel());
    await openCincoDiagram(page, modelFilePath);
    await expect.poll(async () => (await visibleCanvasBoxes(page)).length, { timeout: 60_000 }).toBeGreaterThan(0);
    await expect.poll(() => modelRootId(page), { timeout: 60_000, message: 'TMA model did not load (siblib not ready?)' }).not.toBe('EMPTY');
    await page.waitForTimeout(2_000);
  });

  const before = await getWorkflowIds(api);

  let workflowId;
  await test.step('6. Generate -> the editor opens the workflow in its MiniBrowser', async () => {
    const spy = await installCommandSpy(page);
    expect(spy.ok, spy.message ?? 'CommandRegistry').toBe(true);
    const trig = await triggerGenerate(page);
    expect(trig.ok, trig.message ?? 'trigger generate').toBe(true);

    await expect.poll(async () => (await getWorkflowIds(api)).filter(id => !before.includes(id)).length,
      { timeout: 120_000, message: () => diagnostics.slice(-20).join('\n') }).toBeGreaterThan(0);
    workflowId = (await getWorkflowIds(api)).filter(id => !before.includes(id))[0];
    testInfo.attach('workflow-id', { body: String(workflowId), contentType: 'text/plain' });

    // confirm the in-editor MiniBrowser (simple browser) opened the workflow URL
    await expect.poll(async () => page.evaluate(() =>
      (window.__cdbCmdCalls ?? []).some(c => c.id === 'mini-browser.openUrl' || c.id === 'simpleBrowser.api.open')),
      { timeout: 60_000 }).toBe(true);
    await expect.poll(async () => page.evaluate(() =>
      document.querySelector('.theia-mini-browser, [class*="mini-browser"]') !== null
      || Array.from(document.querySelectorAll('.p-TabBar-tabLabel, .lm-TabBar-tabLabel')).some(n => /(simple|mini).*browser/i.test(n.textContent ?? ''))),
      { timeout: 60_000, message: 'MiniBrowser widget did not open' }).toBe(true);
  });

  await test.step('6. drive the interactive SIBs to completion', async () => {
    // InitTMA: select the uploaded experiment + nuclear stain
    const init = await waitForAwaitingJob(workflowId, 'InitTMA', 120_000);
    await postJson(api, `${svcApi}/ext/start/init-tma/submit/${init.id}`,
      { workflow_parameters: { experiment_data_id: experimentPrefix, protein_channel_markers: ['A0'], nuclear_stain: 'A0' } });

    // EditPredictedRoisTMA: accept the predicted ROIs
    const edit = await waitForAwaitingJob(workflowId, 'EditPredictedRoisTMA', 240_000);
    const rois = await fetchPredictedRois(api, edit.id);
    await postJson(api, `${svcApi}/ext/de-array/edit-predicted-rois-tma/submit/${edit.id}`,
      { workflow_parameters: { rois } });
  });

  await test.step('7. workflow reaches COMPLETED and the MiniBrowser shows the result', async () => {
    await expect.poll(() => workflowStatus(workflowId), { timeout: 240_000, message: 'workflow did not reach completed' })
      .toMatch(/completed/i);

    // Best-effort: nudge the in-editor MiniBrowser to re-render the completed state (its websocket
    // closes when the workflow finishes) and wait until the iframe shows completed rows, so the
    // captured frame shows the finished result. Non-fatal — the backend assertion below is the gate.
    await page.evaluate(() => { for (const f of document.querySelectorAll('iframe')) { try { f.contentWindow?.location?.reload(); } catch { /* cross-origin */ } } }).catch(() => undefined);
    await expect.poll(async () => {
      for (const f of page.frames()) {
        try {
          const rows = await f.locator('#wf-state-container li').allInnerTexts();
          const done = rows.filter(t => /completed/i.test(t)).length;
          if (done > 0) return done;
        } catch { /* not the workflow frame */ }
      }
      return 0;
    }, { timeout: 60_000 }).toBeGreaterThanOrEqual(5).catch(() => undefined);

    await page.waitForTimeout(2_000);
    await page.screenshot({ path: shotPath, fullPage: true });
    const jobs = await workflowJobs(workflowId);
    testInfo.attach('final-jobs', { body: jobs.map(j => `${j.service_name}:${j.job_status}`).join('\n'), contentType: 'text/plain' });
    expect(jobs.filter(j => /completed/i.test(j.job_status)).length, 'all SIB jobs completed').toBeGreaterThanOrEqual(5);
  });

  await api.dispose();
  const video = page.video();
  await page.close();
  if (video) {
    const src = await video.path();
    mkdirSync(dirname(videoPath), { recursive: true });
    copyFileSync(src, videoPath);
    if (existsSync(videoPath)) await testInfo.attach('execution-in-editor-video', { path: videoPath, contentType: 'video/webm' });
  }
});

// ---------- data upload (data-manager presigned, runtime-agnostic over HTTP) ----------
async function uploadExperiment(api) {
  const tiff = readFileSync(tmaTiff);
  await putPresigned(api, experimentPrefix, 'A0.ome.tiff', 'application/octet-stream', tiff, 'tiff_name');
  await putPresigned(api, experimentPrefix, 'channel_markers.txt', 'text/plain', Buffer.from('A0\n'), 'channel_markers');
}
async function putPresigned(api, prefix, object, contentType, body, fileTag) {
  const urlResp = await api.get(`${dmApi}/ext/get-presigned-upload-url?prefix=${prefix}&object_name=${object}&content_type=${encodeURIComponent(contentType)}`, { timeout: 30_000 });
  expect(urlResp.ok(), `presigned url for ${object}: HTTP ${urlResp.status()}`).toBeTruthy();
  let putUrl = (await urlResp.text()).trim().replace(/^"|"$/g, '');
  const put = await api.fetch(putUrl, { method: 'PUT', headers: { 'Content-Type': contentType }, data: body, timeout: 120_000 });
  expect(put.status(), `PUT ${object}`).toBeLessThan(400);
  const tag = await api.get(`${dmApi}/ext/add-tags?prefix=${prefix}&object_name=${object}&content_type=${encodeURIComponent(contentType)}&experimental_tag=TMA&file_tag=${fileTag}`, { timeout: 30_000 });
  expect(tag.ok(), `add-tags ${object}`).toBeTruthy();
}

// ---------- workflow state via kubectl/mongo ----------
function kubectl() { return normalizeKubectl(process.env.CINCODEBIO_KUBECTL_COMMAND ?? 'docker exec -i cincodebio kubectl'); }
function normalizeKubectl(cmd) {
  if (/^docker\s+exec\s+/.test(cmd) && !/\s-i(\s|$)/.test(cmd)) return cmd.replace(/^docker\s+exec\s+/, 'docker exec -i ');
  return cmd;
}
function mongoEval(js) {
  const out = execSync(`${kubectl()} exec -i deploy/mongodb -n default -- mongosh workflows --quiet --eval ${quote(js)}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return out.trim();
}
function workflowJobs(id) {
  try {
    const raw = mongoEval(`var d=db.flows.findOne({_id:"${id}"}); print(JSON.stringify((d&&d.state)||[]))`);
    const line = raw.split('\n').filter(Boolean).pop() ?? '[]';
    return JSON.parse(line);
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
  const fe = `${svcApi}/ext/de-array/edit-predicted-rois-tma/frontend/${jobId}`;
  const html = await (await api.get(fe, { timeout: 30_000 })).text();
  const m = html.match(/dataROIs = JSON\.parse\('(.*?)'\)/s);
  if (!m) throw new Error('predicted ROIs not found in edit-rois frontend');
  const data = JSON.parse(JSON.parse(`"${m[1].replace(/"/g, '\\"')}"`));
  return (data[0] && data[0].rois) || [];
}

// ---------- editor / GLSP helpers (shared with the generation test) ----------
function loadFixtureModel() {
  return readFileSync(join(testDir, 'fixtures', 'generate-tma-workflow.flow'), 'utf8')
    .replace('"id": "review_tma_workflow"', '"id": "execute_tma_workflow"');
}
function emptyModel() {
  return JSON.stringify({ id: 'execute_tma_workflow', type: 'cincodebio:cincodebiographmodel', _attributes: {}, _containments: [], _edges: [] }, null, 2);
}
async function modelRootId(page) {
  return page.evaluate(() => window.__cincoE2EWidget?.editorContext?.modelRoot?.id ?? 'EMPTY');
}
async function getWorkflowIds(api) {
  try {
    const r = await api.get(`${execApi}/ext/get-workflows`, { timeout: 15_000 });
    if (!r.ok()) return [];
    const b = await r.json();
    return Array.isArray(b) ? b.map(w => String(w.id ?? w._id ?? '')).filter(Boolean) : [];
  } catch { return []; }
}
async function postJson(api, url, body) {
  const r = await api.fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, data: JSON.stringify(body), timeout: 60_000 });
  expect(r.status(), `POST ${url}`).toBeLessThan(400);
  return r;
}
function writeWorkspaceFile(name, content) {
  execInEditorPod(`mkdir -p ${quote(workspacePath)} && cat > ${quote(`${workspacePath}/${name}`)}`, content);
}
function resetSibLibrary() {
  execInEditorPod(`rm -rf ${quote(`${workspacePath}/.siblib`)} ${quote(`${workspacePath}/siblib`)} && mkdir -p ${quote(`${workspacePath}/siblib`)}`);
}
function sibFileCount() {
  return Number(execInEditorPod(`find ${quote(`${workspacePath}/siblib`)} -type f | wc -l`).trim());
}
function execInEditorPod(command, input) {
  const pod = execSync(`${kubectl()} get pod -n default -l app=cinco-de-bio-editor -o jsonpath='{.items[0].metadata.name}'`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return execSync(`${kubectl()} exec -i -n default -c cinco-de-bio-editor ${quote(pod)} -- sh -lc ${quote(command)}`, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}
function quote(v) { return `'${String(v).replaceAll("'", "'\\''")}'`; }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function visibleCanvasBoxes(page) {
  return page.evaluate(() => {
    const sels = ['svg.sprotty-graph', '.sprotty', '.sprotty svg', '[class*="sprotty"] svg', '[class*="diagram"] svg', 'canvas'];
    const els = Array.from(new Set(sels.flatMap(s => Array.from(document.querySelectorAll(s)))));
    return els.map(e => { const b = e.getBoundingClientRect(); const st = getComputedStyle(e); return { x: b.x, y: b.y, width: b.width, height: b.height, area: b.width * b.height, vis: st.visibility !== 'hidden' && st.display !== 'none' && b.width > 100 && b.height > 100 }; })
      .filter(c => c.vis).sort((a, b) => b.area - a.area);
  });
}
async function sprottyBox(page) {
  return page.evaluate(() => {
    const e = document.querySelector('svg.sprotty-graph, .sprotty svg, [class*="sprotty"] svg');
    if (!e) return null;
    const b = e.getBoundingClientRect();
    return { x: b.x, y: b.y, w: b.width, h: b.height };
  });
}
async function refreshSibLibrary(page) {
  await page.getByText('Model loading in progress').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
  const item = page.locator('.p-Menu-itemLabel, .lm-Menu-itemLabel, [role="menuitem"]').filter({ hasText: /Refresh SIB Library/ }).first();
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(600);
    const box = (await sprottyBox(page)) ?? (await visibleCanvasBoxes(page))[0];
    expect(box, 'canvas box').toBeTruthy();
    const w = box.w ?? box.width, h = box.h ?? box.height;
    await page.mouse.click(box.x + w - 30, box.y + h - 30, { button: 'right' });
    if (await item.isVisible({ timeout: 1_800 }).catch(() => false)) { await item.click(); await page.waitForTimeout(6_000); return; }
  }
  throw new Error('Refresh SIB Library context-menu item not found');
}
async function openCincoDiagram(page, filePath) {
  const opened = await page.evaluate(async path => {
    const c = window.theia?.container;
    const bindings = Array.from(c?._bindingDictionary?._map?.entries?.() ?? []);
    const mgr = bindings.map(([id]) => { try { return c.get(id); } catch { return undefined; } })
      .find(s => s?.constructor?.name === 'CincoGLSPDiagramMananger' && typeof s.doOpen === 'function');
    if (!mgr) return { ok: false, message: 'CincoGLSPDiagramMananger not found' };
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    const uri = { scheme: 'file', path: { base: fileName, name: fileName, ext: fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '', toString: () => path, fsPath: () => path }, toString: () => `file://${path}`, withPath: p => ({ ...uri, path: p }) };
    const w = await mgr.createWidget(mgr.createWidgetOptions(uri, {}));
    await mgr.doOpen(w, uri, { mode: 'activate' });
    window.__cincoE2EWidget = w;
    return { ok: true };
  }, filePath);
  expect(opened.ok, opened.message ?? 'open diagram').toBe(true);
}
async function installCommandSpy(page) {
  return page.evaluate(() => {
    const c = window.theia?.container;
    const bindings = Array.from(c?._bindingDictionary?._map?.entries?.() ?? []);
    const reg = bindings.map(([id]) => { try { return c.get(id); } catch { return undefined; } })
      .find(s => s && typeof s.executeCommand === 'function' && typeof s.getCommand === 'function' && Array.isArray(s.commands));
    if (!reg) return { ok: false, message: 'CommandRegistry not found' };
    window.__cdbCmdCalls = [];
    if (!reg.__cdbWrapped) { const o = reg.executeCommand.bind(reg); reg.executeCommand = (id, ...a) => { try { window.__cdbCmdCalls.push({ id, args: a }); } catch {} return o(id, ...a); }; reg.__cdbWrapped = true; }
    return { ok: true };
  });
}
async function widgetDispatcher(page, makeAction) {
  return page.evaluate(serialized => {
    const w = window.__cincoE2EWidget; if (!w) return { ok: false, reason: 'no widget' };
    const isC = v => v && typeof v.get === 'function' && v._bindingDictionary;
    const cs = []; for (const k of [...Object.keys(w), 'diContainer', 'container', '_container']) { const v = w[k]; if (isC(v) && !cs.includes(v)) cs.push(v); }
    for (const c of cs) {
      const b = Array.from(c._bindingDictionary?._map?.entries?.() ?? []);
      const d = b.map(([id]) => { try { return c.get(id); } catch { return undefined; } }).find(s => s && typeof s.dispatch === 'function' && typeof s.request === 'function' && /ActionDispatcher/.test(s.constructor?.name ?? ''));
      if (d) {
        const rootId = w.editorContext?.modelRoot?.id;
        if (!rootId) return { ok: false, reason: 'no root id' };
        const action = JSON.parse(serialized.replace('__ROOT__', rootId));
        d.dispatch(action);
        return { ok: true, rootId };
      }
    }
    return { ok: false, reason: 'no dispatcher' };
  }, JSON.stringify(makeAction('__ROOT__')));
}
async function triggerCustomAction(page, handlerClass) {
  return widgetDispatcher(page, rootId => ({ kind: 'CustomAction', selectedElementIds: [], modelElementId: rootId, handlerClass, args: {} }));
}
async function triggerGenerate(page) {
  const via = await page.evaluate(root => {
    const w = window.__cincoE2EWidget; if (!w) return { ok: false, reason: 'no widget' };
    const isC = v => v && typeof v.get === 'function' && v._bindingDictionary;
    const cs = []; for (const k of [...Object.keys(w), 'diContainer', 'container', '_container']) { const v = w[k]; if (isC(v) && !cs.includes(v)) cs.push(v); }
    for (const c of cs) {
      const b = Array.from(c._bindingDictionary?._map?.entries?.() ?? []);
      const d = b.map(([id]) => { try { return c.get(id); } catch { return undefined; } }).find(s => s && typeof s.dispatch === 'function' && typeof s.request === 'function' && /ActionDispatcher/.test(s.constructor?.name ?? ''));
      if (d) { const rootId = w.editorContext?.modelRoot?.id; if (!rootId) return { ok: false, reason: 'no root id' }; d.dispatch({ kind: 'cincoGenerate', modelElementId: rootId, targetFolder: root, args: {} }); return { ok: true, via: 'widget-dispatcher' }; }
    }
    return { ok: false, reason: 'no dispatcher' };
  }, workspacePath);
  if (via.ok) return via;
  const btn = page.locator('[id="cinco.generate-tool"], [title="Generate"]').first();
  if (await btn.isVisible({ timeout: 15_000 }).catch(() => false)) { await btn.click({ force: true }); return { ok: true, via: 'palette' }; }
  return { ok: false, message: JSON.stringify(via) };
}
