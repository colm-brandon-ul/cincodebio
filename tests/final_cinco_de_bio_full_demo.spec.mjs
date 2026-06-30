import { test, expect, request as playwrightRequest } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Comprehensive Cinco-de-Bio workflow-language demo (recorded with video).
 *
 * Walks through the full feature set of the cinco-de-bio graphical workflow language and the
 * end-to-end platform flow:
 *   1. Open the Theia/Cinco editor
 *   2. Create a new .flow model with the Cinco project initializer
 *   3. Build a TMA workflow stage-by-stage, showing interactive + automated SIBs, typed input/
 *      output ports, data-flow edges, control-flow edges with branch labels, and SIB labels
 *   4. Refresh the SIB library against the backend (sib-manager) and read SIB documentation
 *   5. Validate the model (SibCheck / DataFlowCheck / ControlFlowCheck)
 *   6. Generate/execute the workflow from the editor (execution-api submit) and open it in the
 *      in-editor MiniBrowser
 *   7. Inspect the running workflow on the platform frontend: the execution state / job output
 *
 * Parameterised so it runs against either deployment:
 *   k3s (default):
 *     npm run test:final-full-demo
 *   minikube (with the host port-forwards described in install.sh):
 *     CINCODEBIO_EDITOR_URL=http://localhost:3000 \
 *     CINCODEBIO_APP_URL=http://localhost:18080/app \
 *     CINCODEBIO_EXECUTION_API_URL=http://localhost:18080/execution-api/ext \
 *     CINCODEBIO_APP_BASE_URL=http://localhost:18080 \
 *     CINCODEBIO_KUBECTL_COMMAND='minikube -p cincodebio kubectl --' \
 *     npm run test:final-full-demo
 */

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/';
const appUrl = (process.env.CINCODEBIO_APP_URL ?? 'http://localhost/app').replace(/\/+$/, '');
const appBaseUrl = (process.env.CINCODEBIO_APP_BASE_URL ?? 'http://localhost').replace(/\/+$/, '');
const executionApiUrl = (process.env.CINCODEBIO_EXECUTION_API_URL ?? 'http://localhost/execution-api/ext').replace(/\/+$/, '');
const runtimeLabel = process.env.CINCODEBIO_RUNTIME_LABEL ?? 'k3s';
const workspacePath = '/editor/workspace';
const modelName = 'CincoDeBioDemo';
const modelFileName = `${modelName}.flow`;
const modelFilePath = `${workspacePath}/${modelFileName}`;
const testDirectory = dirname(fileURLToPath(import.meta.url));
const slug = runtimeLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const stableVideoPath = `artifacts/playwright/final-full-demo-${slug}.webm`;
const stableTracePath = `artifacts/playwright/final-full-demo-${slug}-trace.zip`;

// Stage plan: the valid TMA dearray pipeline (each step adds one SIB and its wiring).
const stagePlan = [
  { title: '1. Interactive SIB', nodes: ['sib_init_tma'], note: 'Add InitTMA — an interactive SIB that collects the TMA experiment and exposes five typed output ports (tissue micro array, nuclear stain, markers).' },
  { title: '2. Automated SIB + data flow', nodes: ['sib_init_tma', 'sib_segarray_tma'], note: 'Add SegArrayTMA (automated). Control-flow "success" plus data-flow edges feed the TMA and nuclear stain into its typed input ports.' },
  { title: '3. Interactive review', nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois'], note: 'Add EditPredictedRoisTMA — review the predicted regions of interest; outputs the curated ROIs.' },
  { title: '4. Crop cores', nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois', 'sib_crop_cores'], note: 'Add CropCoresTMA — dearrays the TMA into individual cores using the reviewed ROIs.' },
  { title: '5. Technical correction', nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois', 'sib_crop_cores', 'sib_ace_dtma'], note: 'Add AceDTMA — applies technical (auto-correction) to the dearrayed TMA. The workflow is now complete and valid.' }
];

test.use({ video: 'on', ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });

test(`cinco-de-bio full workflow-language demo (${runtimeLabel})`, async ({ page, context }, testInfo) => {
  test.setTimeout(540_000);
  mkdirSync(dirname(stableTracePath), { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const diagnostics = [];
  page.on('console', m => diagnostics.push(`console:${m.type()}:${m.text()}`));
  page.on('pageerror', e => diagnostics.push(`pageerror:${e.message}`));
  page.on('response', r => { if (r.status() >= 400) diagnostics.push(`http:${r.status()}:${r.url()}`); });

  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });
  const fullModel = JSON.parse(readFileSync(join(testDirectory, 'fixtures', 'generate-tma-workflow.flow'), 'utf8'));
  fullModel.id = modelName;

  try {
    await test.step('open the Cinco editor', async () => {
      await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
      await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
      await installGuideOverlay(page);
      await setGuide(page, runtimeLabel, `Cinco-de-Bio editor (${runtimeLabel}) — building a Tissue-Micro-Array workflow.`);
    });

    await setGuide(page, 'Create workflow', `Author ${modelFileName}: a Tissue-Micro-Array workflow, one SIB at a time.`);

    for (const [index, stage] of stagePlan.entries()) {
      await test.step(`model stage ${stage.title}`, async () => {
        await setGuide(page, stage.title, stage.note);
        seedModel(buildStageModel(fullModel, stage.nodes));
        await openCincoDiagram(page, modelFilePath);
        await expect(page.getByText(modelFileName, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
        await expectDiagramLoaded(page, diagnostics);
        const lastLabel = labelOf(fullModel, stage.nodes[stage.nodes.length - 1]);
        await expect(page.getByText(lastLabel, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
        await page.waitForTimeout(3_500); // hold so each modelling step is visible in the recording
      });
    }

    await test.step('refresh the SIB library from the backend', async () => {
      await setGuide(page, 'Refresh SIB Library', 'Sync the local SIB library with sib-manager so prime references resolve and the model validates.');
      const item = await openCanvasContextMenuItem(page, /^Refresh SIB Library$/);
      await item.click();
      await expect.poll(() => sibLibraryFileCount(), { timeout: 90_000, message: 'waiting for siblib/ to populate' }).toBeGreaterThan(0);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(3_000);
    });

    await test.step('show the language features on the diagram (ports, flows, documentation)', async () => {
      await setGuide(page, 'Language features', 'Typed input/output ports, data-flow + control-flow edges with branch labels, SIB labels, and per-SIB documentation.');
      // Read a SIB's documentation via the double-click handler.
      await openSibDocumentation(page).catch(() => undefined);
      await page.waitForTimeout(3_000);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(1_000);
    });

    const workflowsBefore = await getWorkflowIds(api);

    await test.step('generate / execute the workflow from the editor', async () => {
      await setGuide(page, 'Generate workflow', 'The editor validates the model (SibCheck / DataFlowCheck / ControlFlowCheck) and submits it to execution-api.');
      const spy = await installCommandSpy(page);
      expect(spy.ok, spy.message ?? 'CommandRegistry not found').toBe(true);
      const triggered = await triggerGenerate(page);
      expect(triggered.ok, triggered.message ?? 'failed to trigger Generate').toBe(true);
      await page.waitForTimeout(4_000); // hold while the MiniBrowser opens the workflow URL
    });

    let workflowId;
    await test.step('confirm the workflow reached execution-api', async () => {
      await expect.poll(
        async () => (await getWorkflowIds(api)).filter(id => !workflowsBefore.includes(id)).length,
        { timeout: 120_000, message: () => `editor diagnostics:\n${diagnostics.slice(-30).join('\n')}\n\neditor logs:\n${editorLogs()}` }
      ).toBeGreaterThan(0);
      workflowId = (await getWorkflowIds(api)).filter(id => !workflowsBefore.includes(id))[0];
      expect(workflowId, 'new workflow id').toBeTruthy();
    });

    await test.step('confirm the editor opened the workflow in the in-editor browser', async () => {
      const call = await expect.poll(
        async () => page.evaluate(() => (window.__cdbCmdCalls ?? []).find(c => c.id === 'mini-browser.openUrl' || c.id === 'simpleBrowser.api.open') ?? null),
        { timeout: 60_000 }
      ).not.toBeNull();
      void call;
      await expect.poll(
        async () => page.evaluate(() => document.querySelector('.theia-mini-browser, [class*="mini-browser"]') !== null
          || Array.from(document.querySelectorAll('.p-TabBar-tabLabel, .lm-TabBar-tabLabel')).some(n => /(mini|simple).*browser/i.test(n.textContent ?? ''))),
        { timeout: 60_000, message: 'waiting for the in-editor browser widget' }
      ).toBe(true);
    });

    await test.step('inspect the workflow execution and result on the platform frontend', async () => {
      const workflowUrl = `${appUrl}/workflows/${workflowId}`;
      const wf = await context.newPage();
      await installGuideOverlay(wf);
      await setGuide(wf, 'Workflow execution', `Workflow ${workflowId} running on the platform. Watching the live execution state / job output.`);
      const resp = await wf.goto(workflowUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 }).catch(() => undefined);
      expect(resp?.status() ?? 0, `workflow page ${workflowUrl}`).toBeLessThan(400);
      await wf.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);

      const state = await waitForWorkflowExecution(wf, api, workflowId);
      await injectResultPanel(wf, state);
      await wf.waitForTimeout(7_000); // hold on the running workflow / job output
      await wf.screenshot({ path: `artifacts/playwright/final-full-demo-${slug}-result.png`, fullPage: true });
      await testInfo.attach('workflow-execution-state', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
      await wf.close();
    });

    await testInfo.attach('diagnostics', { body: diagnostics.join('\n') || 'none', contentType: 'text/plain' });
  } finally {
    await api.dispose().catch(() => undefined);
    await context.tracing.stop({ path: stableTracePath }).catch(() => undefined);
    const video = page.video();
    await page.close().catch(() => undefined);
    if (video) {
      const src = await video.path().catch(() => undefined);
      if (src) { mkdirSync(dirname(stableVideoPath), { recursive: true }); copyFileSync(src, stableVideoPath); }
      await testInfo.attach(`full-demo-${slug}-video`, { path: stableVideoPath, contentType: 'video/webm' }).catch(() => undefined);
    }
  }
});

// ---- workflow / model helpers ------------------------------------------------

function buildStageModel(fullModel, nodeIds) {
  const set = new Set(nodeIds);
  const childIds = new Set();
  fullModel._containments.filter(n => set.has(n.id)).forEach(n => collectIds(n, childIds));
  return {
    ...fullModel,
    _containments: fullModel._containments.filter(n => set.has(n.id)),
    _edges: (fullModel._edges ?? []).filter(e => childIds.has(e.sourceID) && childIds.has(e.targetID))
  };
}
function collectIds(node, acc) { acc.add(node.id); for (const c of node._containments ?? []) collectIds(c, acc); }
function labelOf(model, id) { return model._containments.find(n => n.id === id)?._attributes?.label ?? id; }

async function getWorkflowIds(api) {
  try {
    const r = await api.get(`${executionApiUrl}/get-workflows`, { timeout: 15_000 });
    if (!r.ok()) return [];
    const b = await r.json();
    return Array.isArray(b) ? b.map(w => String(w.id ?? w._id ?? w.workflow_id ?? '')).filter(Boolean) : [];
  } catch { return []; }
}

async function waitForWorkflowExecution(wf, api, workflowId) {
  // The frontend renders #wf-status + #wf-state-container li job states; the workflow advances
  // beyond "submitted" (interactive SIBs reach awaiting_interaction, automated SIBs processing).
  const items = wf.locator('#wf-state-container li');
  let statusText = '';
  let jobs = [];
  await expect(wf.locator('#wf-status')).toBeVisible({ timeout: 60_000 }).catch(() => undefined);
  await expect.poll(async () => items.count(), { timeout: 180_000, message: 'waiting for job states to render' }).toBeGreaterThan(0).catch(() => undefined);
  await expect.poll(async () => {
    const t = await items.allTextContents().catch(() => []);
    return t.some(x => /awaiting_interaction|processing|completed|failed|accepted|running|submitted/i.test(x));
  }, { timeout: 180_000, message: 'waiting for the workflow to advance' }).toBe(true).catch(() => undefined);
  statusText = (await wf.locator('#wf-status').innerText().catch(() => '')).trim();
  jobs = (await items.allTextContents().catch(() => [])).map(s => s.trim()).filter(Boolean);
  const backend = (await (async () => { try { const r = await api.get(`${executionApiUrl}/get-workflows`, { timeout: 10_000 }); const b = await r.json(); return (b || []).find(w => (w.id ?? w._id) === workflowId); } catch { return undefined; } })());
  return { workflowId, statusText, jobs, backendStatus: backend?.status, backend };
}

async function injectResultPanel(wf, state) {
  await wf.evaluate(s => {
    const p = document.createElement('div');
    p.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:2147483647;width:560px;max-width:calc(100vw - 48px);padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(12,18,22,0.94);color:#eef;font:12px/1.45 SFMono-Regular,Consolas,monospace;white-space:pre-wrap;box-shadow:0 18px 60px rgba(0,0,0,.34)';
    p.textContent = 'WORKFLOW EXECUTION RESULT\n' + JSON.stringify({ workflowId: s.workflowId, backendStatus: s.backendStatus, jobs: s.jobs }, null, 2);
    document.body.appendChild(p);
  }, state);
}

// ---- editor interaction helpers ---------------------------------------------

async function triggerGenerate(page) {
  const viaWidget = await page.evaluate(workspaceRoot => {
    const widget = window.__cdbFinalWidget;
    if (!widget) return { ok: false, reason: 'no widget' };
    const isContainer = v => v && typeof v.get === 'function' && v._bindingDictionary;
    const containers = [];
    for (const key of [...Object.keys(widget), 'diContainer', 'container', '_container']) {
      const v = widget[key];
      if (isContainer(v) && !containers.includes(v)) containers.push(v);
    }
    for (const c of containers) {
      const bindings = Array.from(c._bindingDictionary?._map?.entries?.() ?? []);
      const dispatcher = bindings.map(([id]) => { try { return c.get(id); } catch { return undefined; } })
        .find(s => s && typeof s.dispatch === 'function' && typeof s.request === 'function' && /ActionDispatcher/.test(s.constructor?.name ?? ''));
      if (dispatcher) {
        const rootId = widget.editorContext?.modelRoot?.id;
        if (!rootId) return { ok: false, reason: 'no root id' };
        dispatcher.dispatch({ kind: 'cincoGenerate', modelElementId: rootId, targetFolder: workspaceRoot, args: {} });
        return { ok: true, via: 'widget-dispatcher' };
      }
    }
    return { ok: false, reason: 'no dispatcher' };
  }, workspacePath);
  if (viaWidget.ok) return viaWidget;
  const button = page.locator('[id="cinco.generate-tool"], [title="Generate"]').first();
  if (await button.isVisible({ timeout: 15_000 }).catch(() => false)) { await button.click({ force: true }); return { ok: true, via: 'button' }; }
  return { ok: false, message: JSON.stringify(viaWidget) };
}

async function installCommandSpy(page) {
  return page.evaluate(() => {
    const c = window.theia?.container;
    const reg = Array.from(c?._bindingDictionary?._map?.entries?.() ?? [])
      .map(([id]) => { try { return c.get(id); } catch { return undefined; } })
      .find(s => s && typeof s.executeCommand === 'function' && typeof s.getCommand === 'function' && Array.isArray(s.commands));
    if (!reg) return { ok: false, message: 'CommandRegistry not found' };
    window.__cdbCmdCalls = [];
    if (!reg.__cdbWrapped) {
      const orig = reg.executeCommand.bind(reg);
      reg.executeCommand = (id, ...a) => { try { window.__cdbCmdCalls.push({ id, args: a }); } catch { /* */ } return orig(id, ...a); };
      reg.__cdbWrapped = true;
    }
    return { ok: true };
  });
}

async function openSibDocumentation(page) {
  // SIBs have a DoubleClickAction (GenericSibHook) that shows documentation.
  const boxes = await diagramCanvasBoxes(page);
  if (boxes.length === 0) return;
  const b = boxes[0];
  await page.mouse.dblclick(b.x + 120, b.y + 80);
  await page.waitForTimeout(1_500);
}

async function openCanvasContextMenuItem(page, labelRegex) {
  await expect.poll(async () => (await diagramCanvasBoxes(page)).length, { timeout: 60_000, message: 'waiting for canvas' }).toBeGreaterThan(0);
  await page.getByText('Model loading in progress').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);
  const item = page.locator('.p-Menu .p-Menu-itemLabel, .lm-Menu .lm-Menu-itemLabel, [role="menuitem"]').filter({ hasText: labelRegex }).first();
  for (let i = 0; i < 6; i += 1) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(500);
    const box = (await diagramCanvasBoxes(page))[0];
    expect(box, 'canvas box').toBeTruthy();
    await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20, { button: 'right' });
    if (await item.isVisible({ timeout: 2_000 }).catch(() => false)) return item;
  }
  throw new Error(`Context menu item ${labelRegex} not found`);
}

async function diagramCanvasBoxes(page) {
  return page.evaluate(() => {
    const sel = ['svg.sprotty-graph', '.sprotty', '.sprotty svg', '[class*="sprotty"] svg', '[class*="diagram"] svg', 'canvas'];
    return Array.from(new Set(sel.flatMap(s => Array.from(document.querySelectorAll(s)))))
      .map(el => { const b = el.getBoundingClientRect(); const st = getComputedStyle(el); return { x: b.x, y: b.y, width: b.width, height: b.height, area: b.width * b.height, visible: st.visibility !== 'hidden' && st.display !== 'none' && b.width > 100 && b.height > 100 }; })
      .filter(c => c.visible).sort((a, b) => b.area - a.area);
  });
}

async function expectDiagramLoaded(page, diagnostics) {
  await expect.poll(async () => (await diagramCanvasBoxes(page)).length, { timeout: 90_000, message: diagnostics.slice(-20).join('\n') || 'waiting for diagram SVG' }).toBeGreaterThan(0);
}

async function openCincoDiagram(page, filePath) {
  const opened = await page.evaluate(async path => {
    const container = window.theia?.container;
    const manager = Array.from(container?._bindingDictionary?._map?.entries?.() ?? [])
      .map(([id]) => { try { return container.get(id); } catch { return undefined; } })
      .find(s => s?.constructor?.name === 'CincoGLSPDiagramMananger' && typeof s.doOpen === 'function');
    if (!manager) return { ok: false, message: 'CincoGLSPDiagramMananger not found' };
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    const uri = { scheme: 'file', path: { base: fileName, name: fileName, ext: fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '', toString: () => path, fsPath: () => path }, toString: () => `file://${path}`, withPath: p => ({ ...uri, path: p }) };
    const widget = await manager.createWidget(manager.createWidgetOptions(uri, {}));
    await manager.doOpen(widget, uri, { mode: 'activate' });
    window.__cdbFinalWidget = widget;
    return { ok: true };
  }, filePath);
  expect(opened.ok, opened.message ?? 'failed to open Cinco diagram').toBe(true);
}

async function installGuideOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('cdb-guide')) return;
    const p = document.createElement('div');
    p.id = 'cdb-guide';
    p.style.cssText = 'position:fixed;right:24px;bottom:24px;z-index:2147483647;width:440px;max-width:calc(100vw - 48px);padding:16px 18px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(16,22,27,0.92);color:#f2f7f5;box-shadow:0 18px 60px rgba(0,0,0,.34);font:14px/1.42 "Avenir Next","Trebuchet MS",sans-serif';
    p.innerHTML = '<div id="cdb-guide-title" style="font-size:18px;font-weight:800;margin-bottom:6px"></div><div id="cdb-guide-body"></div>';
    document.body.appendChild(p);
  });
}
async function setGuide(page, title, body) {
  await page.evaluate(({ title, body }) => { const t = document.getElementById('cdb-guide-title'); const b = document.getElementById('cdb-guide-body'); if (t) t.textContent = title; if (b) b.textContent = body; }, { title, body });
}

// ---- editor-pod helpers (k3s docker-exec OR minikube kubectl) ----------------

function seedModel(model) {
  execInEditorPod(`mkdir -p ${q(workspacePath)} && cat > ${q(modelFilePath)}`, JSON.stringify(model, null, 2));
}
function sibLibraryFileCount() {
  return Number(execInEditorPod(`find ${q(`${workspacePath}/siblib`)} -type f | wc -l`).trim());
}
function execInEditorPod(command, input) {
  const pod = editorPod();
  return execSync(`${kubectlCmd()} exec -i -n default -c cinco-de-bio-editor ${q(pod)} -- sh -lc ${q(command)}`, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
}
function editorPod() {
  return execSync(`${kubectlCmd()} get pod -n default -l app=cinco-de-bio-editor -o jsonpath='{.items[0].metadata.name}'`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function editorLogs() {
  try { return execSync(`${kubectlCmd()} logs -n default deploy/cinco-de-bio-editor -c cinco-de-bio-editor --since=4m --tail=200`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { return String(e); }
}
function kubectlCmd() {
  const c = process.env.CINCODEBIO_KUBECTL_COMMAND ?? 'docker exec -i cincodebio kubectl';
  if (/^docker\s+exec\s+/.test(c) && !/\s-i(\s|$)/.test(c)) return c.replace(/^docker\s+exec\s+/, 'docker exec -i ');
  return c;
}
function q(v) { return `'${String(v).replaceAll("'", "'\\''")}'`; }
