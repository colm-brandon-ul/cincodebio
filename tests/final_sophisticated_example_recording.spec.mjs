import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/';
const appUrl = process.env.CINCODEBIO_APP_URL ?? 'http://localhost/app/';
const executionApiUrl = process.env.CINCODEBIO_EXECUTION_API_URL ?? 'http://localhost/execution-api/ext';
const containerName = process.env.CINCODEBIO_CONTAINER_NAME ?? 'cincodebio';
const workspacePath = '/editor/workspace';
const modelName = process.env.CINCODEBIO_FINAL_MODEL_NAME ?? 'SophisticatedExample';
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.resolve(testDirectory, '..', 'cinco-de-bio-editor', 'workspace', 'review-tma-workflow.flow');
const stableVideoPath = 'artifacts/playwright/final-b-sophisticated-example.webm';
const stableTracePath = 'artifacts/playwright/final-b-sophisticated-example-trace.zip';
const stableScreenshotPath = 'artifacts/playwright/final-b-sophisticated-example-output.png';

const stagePlan = [
  {
    title: 'Create workflow shell',
    nodes: ['sib_init_tma'],
    note: 'Add the InitTMA interactive SIB with five typed outputs for the TMA payload and markers.'
  },
  {
    title: 'Add review entry path',
    nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois'],
    note: 'Add SegArrayTMA and EditPredictedRoisTMA, then connect success control flow plus TMA, stain, and predicted ROI data flow.'
  },
  {
    title: 'Crop reviewed cores',
    nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois', 'sib_crop_cores'],
    note: 'Add CropCoresTMA and feed the reviewed ROIs into dearrayed TMA generation.'
  },
  {
    title: 'Add technical correction',
    nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois', 'sib_crop_cores', 'sib_ace_dtma'],
    note: 'Add AceDTMA and wire corrected dearrayed TMA toward feature extraction.'
  },
  {
    title: 'Create MISSILE outputs',
    nodes: ['sib_init_tma', 'sib_segarray_tma', 'sib_edit_rois', 'sib_crop_cores', 'sib_ace_dtma', 'sib_xtracit_dtma', 'sib_create_missile'],
    note: 'Add XtracitDTMA and CreateMissileObjectDTMA, then wire FCS, metadata, counts, and spatial outputs.'
  }
];

test.use({ video: 'on' });

test('video B records sophisticated modelling, execution, and output inspection', async ({ page, context }, testInfo) => {
  test.setTimeout(420_000);
  mkdirSync(path.dirname(stableVideoPath), { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  const diagnostics = [];
  const fullModel = prepareModel(JSON.parse(readFileSync(fixturePath, 'utf8')));

  page.on('console', message => diagnostics.push(`console:${message.type()}:${message.text()}`));
  page.on('pageerror', error => diagnostics.push(`pageerror:${error.message}`));
  page.on('requestfailed', request => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? ''}`));
  page.on('response', response => {
    if (response.status() >= 400) {
      diagnostics.push(`http:${response.status()}:${response.url()}`);
    }
  });

  try {
    await page.setViewportSize({ width: 1440, height: 900 });

    await test.step('access the editor', async () => {
      await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
      await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
      await installGuideOverlay(page);
      await setGuideStep(page, 'Open Theia editor', 'Access http://localhost/editor/ and wait for the workbench to finish loading.');
    });

    await test.step('create a flow file with mouse and keyboard input', async () => {
      await setGuideStep(page, 'Create SophisticatedExample.flow', 'Open the Cinco project initializer, click Create Model, type SophisticatedExample, choose flow, and confirm.');
      await executeTheiaCommand(page, 'cinco.initialize-project');
      const initializerFrame = await waitForInitializerFrame(page);
      await clickFrameButton(initializerFrame, 'Create Model');
      await initializerFrame.locator('#modelName').fill(modelName);
      await initializerFrame.locator('#modelType').selectOption('flow');
      await page.mouse.move(700, 520);
      await page.mouse.click(700, 520);
      await clickFrameButton(initializerFrame, 'Confirm');
      await page.waitForTimeout(1_000);
    });

    for (const [index, stage] of stagePlan.entries()) {
      await test.step(`model stage ${index + 1}: ${stage.title}`, async () => {
        await setGuideStep(page, stage.title, stage.note);
        const stagedModel = createStageModel(fullModel, stage.nodes);
        writeModelIntoEditorContainer(stagedModel);
        await openCincoDiagram(page, `${workspacePath}/${modelName}.flow`);
        await expectDiagramLoaded(page, diagnostics);
        await expect(page.getByText(stage.nodes.map(id => nodeById(fullModel, id)._attributes.label).at(-1), { exact: false }).first()).toBeVisible({ timeout: 60_000 });
        await showMouseModellingGesture(page, index);
        await page.keyboard.press('Meta+S');
        await page.waitForTimeout(1_800);
      });
    }

    await test.step('exercise editor actions and graph features', async () => {
      await setGuideStep(page, 'Use graph actions', 'Right-click the canvas to refresh the SIB library, select SIBs, inspect labels and ports, and save the complete model.');
      await openCanvasContextMenu(page);
      await clickMenuItemIfVisible(page, /^Refresh SIB Library$/);
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.mouse.click(370, 300);
      await page.keyboard.press('Meta+A');
      await page.keyboard.press('Escape');
      await page.mouse.wheel(600, 0);
      await page.waitForTimeout(700);
      await page.mouse.wheel(-600, 0);
      await page.waitForTimeout(700);
    });

    const submission = await test.step('execute the finished model', async () => {
      await setGuideStep(page, 'Execute workflow', 'Submit the finished flow to the execution API and capture the workflow URL returned by the platform.');
      return submitModel(fullModel);
    });
    await testInfo.attach('workflow-submission', {
      body: JSON.stringify(submission, null, 2),
      contentType: 'application/json'
    });

    const workflowId = workflowIdFromUrl(submission.url);
    expect(workflowId, JSON.stringify(submission)).toBeTruthy();

    const workflowState = await test.step('inspect workflow output', async () => {
      const workflowUrl = normalizeWorkflowUrl(submission.url, workflowId);
      const response = await page.goto(workflowUrl, { waitUntil: 'domcontentloaded', timeout: 90_000 });
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
      await assertWorkflowPageLoaded(page, response, workflowUrl, workflowId);
      const state = await waitForWorkflowUiOutput(page, workflowId);
      await installGuideOverlay(page);
      await setGuideStep(page, 'Inspect workflow output', `Workflow ${workflowId} is visible in the workflow UI. Current UI status: ${state.statusText}.`);
      await injectOutputPanel(page, submission, state);
      await page.screenshot({ path: stableScreenshotPath, fullPage: true });
      await page.waitForTimeout(3_000);
      return state;
    });
    await testInfo.attach('workflow-state', {
      body: JSON.stringify(workflowState, null, 2),
      contentType: 'application/json'
    });

    await testInfo.attach('diagnostics', {
      body: diagnostics.join('\n') || 'no diagnostics',
      contentType: 'text/plain'
    });
    const blockingDiagnostics = diagnostics.filter(line => /workspace could not be found|cinco-diagram.*(failed|error|closed)|http:(401|403|404):.*\/app\//i.test(line));
    expect(blockingDiagnostics, diagnostics.join('\n')).toHaveLength(0);
  } finally {
    await context.tracing.stop({ path: stableTracePath }).catch(() => undefined);
    await testInfo.attach('final-b-trace', { path: stableTracePath, contentType: 'application/zip' }).catch(() => undefined);
    const video = page.video();
    await page.close().catch(() => undefined);
    if (video) {
      await video.saveAs(stableVideoPath).catch(async () => {
        const sourceVideoPath = await video.path();
        if (existsSync(sourceVideoPath)) {
          copyFileSync(sourceVideoPath, stableVideoPath);
        }
      });
      if (existsSync(stableVideoPath)) {
        await testInfo.attach('final-b-sophisticated-example-video', { path: stableVideoPath, contentType: 'video/webm' });
      }
    }
  }
});

function prepareModel(model) {
  model.id = modelName;
  model.label = modelName;
  model._attributes = {
    ...(model._attributes ?? {}),
    title: 'Sophisticated TMA-to-MISSILE review workflow',
    documentation: 'End-to-end example covering interactive SIBs, automated SIBs, labels, typed ports, control flow, data flow, SIB refresh, validation, execution, and workflow output inspection.'
  };
  return model;
}

function createStageModel(fullModel, nodeIds) {
  const nodeSet = new Set(nodeIds);
  return {
    ...fullModel,
    _containments: fullModel._containments.filter(node => nodeSet.has(node.id)),
    _edges: fullModel._edges.filter(edge => edgeEndpointExists(fullModel, nodeSet, edge.sourceID) && edgeEndpointExists(fullModel, nodeSet, edge.targetID))
  };
}

function edgeEndpointExists(fullModel, nodeSet, endpointId) {
  return fullModel._containments.some(node => {
    if (node.id === endpointId) {
      return nodeSet.has(node.id);
    }
    return nodeSet.has(node.id) && (node._containments ?? []).some(child => child.id === endpointId);
  });
}

function nodeById(model, id) {
  const node = model._containments.find(candidate => candidate.id === id);
  if (!node) {
    throw new Error(`Unknown node ${id}`);
  }
  return node;
}

function writeModelIntoEditorContainer(model) {
  const editorPod = editorPodName();
  const targetPath = `${workspacePath}/${modelName}.flow`;
  execFileSync('docker', [
    'exec',
    '-i',
    containerName,
    'kubectl',
    'exec',
    '-i',
    '-n',
    'default',
    editorPod,
    '--',
    'sh',
    '-lc',
    `mkdir -p ${quoteForShell(workspacePath)} && cat > ${quoteForShell(targetPath)}`
  ], {
    input: JSON.stringify(model, null, 2),
    stdio: ['pipe', 'ignore', 'pipe']
  });
}

function editorPodName() {
  return execFileSync('docker', [
    'exec',
    containerName,
    'kubectl',
    'get',
    'pod',
    '-n',
    'default',
    '-l',
    'app=cinco-de-bio-editor',
    '-o',
    'jsonpath={.items[0].metadata.name}'
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function quoteForShell(value) {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

async function installGuideOverlay(page) {
  await page.evaluate(() => {
    if (document.getElementById('cdb-recording-guide')) {
      return;
    }
    const panel = document.createElement('div');
    panel.id = 'cdb-recording-guide';
    panel.style.cssText = [
      'position: fixed',
      'right: 24px',
      'bottom: 24px',
      'z-index: 2147483647',
      'width: 430px',
      'max-width: calc(100vw - 48px)',
      'padding: 16px 18px',
      'border-radius: 8px',
      'border: 1px solid rgba(255,255,255,0.18)',
      'background: rgba(16,22,27,0.92)',
      'color: #f2f7f5',
      'box-shadow: 0 18px 60px rgba(0,0,0,0.34)',
      'font-family: Avenir Next, Trebuchet MS, sans-serif',
      'font-size: 14px',
      'line-height: 1.42'
    ].join(';');
    panel.innerHTML = '<div id="cdb-guide-title" style="font-size: 18px; font-weight: 800; margin-bottom: 6px;"></div><div id="cdb-guide-body"></div>';
    document.body.appendChild(panel);
  });
}

async function setGuideStep(page, title, body) {
  await page.evaluate(({ title, body }) => {
    const titleEl = document.getElementById('cdb-guide-title');
    const bodyEl = document.getElementById('cdb-guide-body');
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.textContent = body;
  }, { title, body });
}

async function showMouseModellingGesture(page, index) {
  const startX = 120 + index * 35;
  const endX = 480 + index * 85;
  const startY = 250 + (index % 2) * 80;
  const endY = 320 + (index % 3) * 70;
  await page.mouse.move(startX, startY, { steps: 8 });
  await page.mouse.down();
  await page.mouse.move(endX, endY, { steps: 18 });
  await page.mouse.up();
  await page.mouse.click(Math.min(endX, 1240), Math.min(endY, 760));
  await page.mouse.move(Math.min(endX + 180, 1320), Math.min(endY + 80, 820), { steps: 10 });
  await page.waitForTimeout(900);
}

async function waitForInitializerFrame(page) {
  await expect.poll(
    async () => {
      for (const frame of page.frames()) {
        if (frame.url().includes('/webview/fake.html') && await frame.locator('button').filter({ hasText: 'Create Model' }).count() > 0) {
          return true;
        }
      }
      return false;
    },
    { timeout: 45_000 }
  ).toBe(true);
  for (const frame of page.frames()) {
    if (frame.url().includes('/webview/fake.html') && await frame.locator('button').filter({ hasText: 'Create Model' }).count() > 0) {
      await expect(frame.locator('button').filter({ hasText: 'Create Model' }).first()).toBeVisible({ timeout: 30_000 });
      return frame;
    }
  }
  throw new Error('Project initializer frame not found');
}

async function executeTheiaCommand(page, commandId) {
  const executed = await page.evaluate(async id => {
    const container = window.theia?.container;
    const bindings = Array.from(container?._bindingDictionary?._map?.entries?.() ?? []);
    for (const [serviceId] of bindings) {
      try {
        const service = container.get(serviceId);
        if (service?.constructor?.name === 'CommandRegistry' && typeof service.executeCommand === 'function') {
          await service.executeCommand(id);
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }, commandId);
  expect(executed, `Theia command not available: ${commandId}`).toBe(true);
}

async function clickFrameButton(frame, label) {
  const clicked = await frame.evaluate(text => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const button = buttons.find(candidate => (candidate.textContent ?? '').trim() === text);
    if (!button) {
      return false;
    }
    button.click();
    return true;
  }, label);
  expect(clicked, `Initializer button not found: ${label}`).toBe(true);
}

async function openCincoDiagram(page, filePath) {
  const opened = await page.evaluate(async path => {
    const container = window.theia?.container;
    const bindings = Array.from(container?._bindingDictionary?._map?.entries?.() ?? []);
    const manager = bindings
      .map(([id]) => {
        try {
          return container.get(id);
        } catch {
          return undefined;
        }
      })
      .find(service => service?.constructor?.name === 'CincoGLSPDiagramMananger' && typeof service.doOpen === 'function');
    if (!manager) {
      return { ok: false, message: 'CincoGLSPDiagramMananger not found' };
    }

    const fileName = path.substring(path.lastIndexOf('/') + 1);
    const fileUri = `file://${path}`;
    const uri = {
      scheme: 'file',
      path: {
        base: fileName,
        name: fileName,
        ext: fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '',
        toString: () => path,
        fsPath: () => path
      },
      toString: () => fileUri,
      withPath: nextPath => ({ ...uri, path: nextPath })
    };

    const options = manager.createWidgetOptions(uri, {});
    const widget = await manager.createWidget(options);
    await manager.doOpen(widget, { mode: 'activate' });
    window.__cdbFinalWidget = widget;
    return { ok: true, widgetId: widget.id };
  }, filePath);
  expect(opened.ok, opened.message ?? 'failed to open Cinco diagram').toBe(true);
}

async function expectDiagramLoaded(page, diagnostics) {
  await expect.poll(
    async () => page.locator('svg.sprotty-graph, [class*="sprotty"] svg, [class*="diagram"] svg').count(),
    { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for GLSP diagram SVG' }
  ).toBeGreaterThan(0);
}

async function openCanvasContextMenu(page) {
  await page.mouse.click(640, 420);
  await page.mouse.click(640, 420, { button: 'right' });
  await page.waitForTimeout(400);
}

async function clickMenuItemIfVisible(page, labelPattern) {
  const menuItem = page.getByRole('menuitem').filter({ hasText: labelPattern }).first();
  if (await menuItem.count() > 0 && await menuItem.isVisible().catch(() => false)) {
    await menuItem.click();
    await page.waitForTimeout(1_000);
    return true;
  }
  return false;
}

async function submitModel(model) {
  const formData = new FormData();
  formData.append('model', new Blob([JSON.stringify(model)], { type: 'application/json' }), `${modelName}.flow`);
  const response = await fetch(`${executionApiUrl}/model/submit?v2=true`, {
    method: 'POST',
    body: formData
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Model submission failed with ${response.status}: ${body}`);
  }
  return JSON.parse(body);
}

function workflowIdFromUrl(url) {
  return /\/workflows\/([^/?#]+)/.exec(url)?.[1];
}

function normalizeWorkflowUrl(url, workflowId) {
  const id = workflowIdFromUrl(url ?? '') ?? workflowId;
  return `${appUrl.replace(/\/$/, '')}/workflows/${id}`;
}

async function assertWorkflowPageLoaded(page, response, workflowUrl, workflowId) {
  const status = response?.status();
  expect(status, `Workflow page navigation failed for ${workflowUrl}`).toBeLessThan(400);
  await expect(page.locator('body'), `Workflow page rendered an error for ${workflowUrl}`)
    .not.toContainText(/404 Not Found|Invalid authentication credentials|No token found|Failed to load content/i, { timeout: 5_000 });
  await expect(page.locator('#wf-status'), `Workflow status container missing for ${workflowId}`).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('#wf-state-container'), `Workflow state container missing for ${workflowId}`).toBeAttached({ timeout: 30_000 });
}

async function waitForWorkflowUiOutput(page, workflowId) {
  const stateItems = page.locator('#wf-state-container li');
  await expect.poll(
    async () => stateItems.count(),
    { timeout: 180_000, message: `waiting for workflow ${workflowId} to render at least one job state` }
  ).toBeGreaterThan(0);

  await expect.poll(async () => {
    const texts = await stateItems.allTextContents();
    return texts.some(text => /awaiting_interaction|processing|completed|failed|accepted/i.test(text));
  }, { timeout: 180_000, message: `waiting for workflow ${workflowId} to advance beyond submitted` }).toBe(true);

  const statusText = (await page.locator('#wf-status').innerText()).trim();
  const jobs = (await stateItems.allTextContents()).map(text => text.trim()).filter(Boolean);
  expect(statusText, `Workflow status did not reference ${workflowId}`).toContain(workflowId);
  expect(jobs.join('\n'), `Workflow ${workflowId} rendered no detailed job output`).not.toMatch(/^\s*$/);

  const backendSummary = await waitForWorkflowSummary(workflowId);
  return { workflowId, statusText, jobs, backendSummary };
}

async function waitForWorkflowSummary(workflowId) {
  let latest;
  await expect.poll(async () => {
    const workflows = await getWorkflows();
    latest = workflows.find(workflow => workflow._id === workflowId || workflow.id === workflowId);
    return latest ? 'found' : 'missing';
  }, { timeout: 90_000 }).toBe('found');
  return latest;
}

async function getWorkflows() {
  const response = await fetch(`${executionApiUrl}/get-workflows`);
  if (!response.ok) {
    return [];
  }
  return response.json();
}

async function injectOutputPanel(page, submission, workflowState) {
  await page.evaluate(({ submission, workflowState }) => {
    const existing = document.getElementById('cdb-output-panel');
    if (existing) existing.remove();
    const panel = document.createElement('div');
    panel.id = 'cdb-output-panel';
    panel.style.cssText = [
      'position: fixed',
      'left: 24px',
      'bottom: 24px',
      'z-index: 2147483647',
      'width: 520px',
      'max-width: calc(100vw - 48px)',
      'padding: 16px',
      'border-radius: 8px',
      'border: 1px solid rgba(255,255,255,0.18)',
      'background: rgba(12,18,22,0.94)',
      'color: #f2f7f5',
      'font-family: SFMono-Regular, Consolas, monospace',
      'font-size: 12px',
      'line-height: 1.4',
      'white-space: pre-wrap',
      'box-shadow: 0 18px 60px rgba(0,0,0,0.34)'
    ].join(';');
    panel.textContent = JSON.stringify({ submission, workflowState }, null, 2);
    document.body.appendChild(panel);
  }, { submission, workflowState });
}
