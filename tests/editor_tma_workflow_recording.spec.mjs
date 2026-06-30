import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost:3000';
const modelFileName = 'review-tma-workflow.flow';
const modelBaseName = 'review-tma-workflow';
const workspacePath = '/editor/workspace';
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDirectory, 'fixtures', modelFileName);
const stableTracePath = 'artifacts/playwright/editor-tma-workflow-trace.zip';
const stagedSibs = [
  'sib_init_tma',
  'sib_segarray_tma',
  'sib_edit_rois',
  'sib_crop_cores',
  'sib_ace_dtma',
  'sib_xtracit_dtma',
  'sib_create_missile'
];
const stagedLabels = [
  'InitTMA',
  'SegArrayTMA',
  'EditPredictedRoisTMA',
  'CropCoresTMA',
  'AceDTMA',
  'XtracitDTMA',
  'CreateMissileObjectDTMA'
];

test.use({ video: 'on' });

test('records step-by-step modeling of a sophisticated CincoDeBio TMA workflow', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  mkdirSync(path.dirname(stableTracePath), { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const fullModel = JSON.parse(readFileSync(fixturePath, 'utf8'));

  const diagnostics = [];
  page.on('console', message => diagnostics.push(`console:${message.type()}:${message.text()}`));
  page.on('pageerror', error => diagnostics.push(`pageerror:${error.message}`));
  page.on('requestfailed', request => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? ''}`));
  page.on('response', response => {
    if (response.status() >= 400) {
      diagnostics.push(`http:${response.status()}:${response.url()}`);
    }
  });

  await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
  await expect(page.locator('body')).toContainText('File', { timeout: 60_000 });
  await installRecordingOverlay(page);

  const stageMessages = [];
  for (let stageIndex = 0; stageIndex < stagedSibs.length; stageIndex += 1) {
    const stageNumber = stageIndex + 1;
    const stageModel = buildStageModel(fullModel, stageIndex);
    const stageFileName = `${modelBaseName}-step-${String(stageNumber).padStart(2, '0')}.flow`;
    const stagePath = `${workspacePath}/${stageFileName}`;
    const seedResult = writeWorkflowModel(stageFileName, JSON.stringify(stageModel, null, 2));
    test.skip(!seedResult.seeded, seedResult.message);
    stageMessages.push(seedResult.message);

    await updateRecordingOverlay(page, `Step ${stageNumber}: add ${stagedLabels[stageIndex]}`);
    await openCincoDiagram(page, stagePath);
    await expect(page.getByText(stageFileName, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
    await expect.poll(
      async () => page.locator('svg.sprotty-graph, [class*="sprotty"] svg, [class*="diagram"] svg').count(),
      { timeout: 90_000, message: diagnostics.join('\n') || `waiting for workflow diagram SVG at stage ${stageNumber}` }
    ).toBeGreaterThan(0);

    await expectDiagramLabels(page, stagedLabels.slice(0, stageNumber), diagnostics);

    await page.screenshot({ path: `artifacts/playwright/editor-tma-workflow-step-${String(stageNumber).padStart(2, '0')}.png`, fullPage: true });
    await page.waitForTimeout(1_200);
  }

  await page.screenshot({ path: 'artifacts/playwright/editor-tma-workflow-opened.png', fullPage: true });
  await testInfo.attach('seed', { body: stageMessages.join('\n'), contentType: 'text/plain' });
  await testInfo.attach('diagnostics', { body: diagnostics.join('\n') || 'no diagnostics', contentType: 'text/plain' });

  const blockingDiagnostics = diagnostics.filter(line => /spawn ps|workspace could not be found|cinco-diagram.*(failed|error|closed)/i.test(line));
  expect(blockingDiagnostics, diagnostics.join('\n')).toHaveLength(0);

  await context.tracing.stop({ path: stableTracePath });
  await testInfo.attach('tma-workflow-trace', { path: stableTracePath, contentType: 'application/zip' });

  const video = page.video();
  await page.close();
  if (video) {
    const sourceVideoPath = await video.path();
    const stableVideoPath = 'artifacts/playwright/editor-tma-workflow-step-by-step.webm';
    mkdirSync(path.dirname(stableVideoPath), { recursive: true });
    copyFileSync(sourceVideoPath, stableVideoPath);
    await testInfo.attach('step-by-step-video', { path: stableVideoPath, contentType: 'video/webm' });
  }
});

function writeWorkflowModel(fileName, content) {
  const hostWorkspace = process.env.CINCODEBIO_EDITOR_WORKSPACE_DIR;
  if (hostWorkspace) {
    mkdirSync(hostWorkspace, { recursive: true });
    writeFileSync(path.join(hostWorkspace, fileName), content);
    return { seeded: true, message: `seeded ${fileName} into ${hostWorkspace}` };
  }

  const kubectlCommand = normalizeKubectlCommand(process.env.CINCODEBIO_KUBECTL_COMMAND ?? 'kubectl');
  const namespace = process.env.CINCODEBIO_EDITOR_NAMESPACE ?? 'default';
  const selector = process.env.CINCODEBIO_EDITOR_POD_SELECTOR ?? 'app=cinco-de-bio-editor';
  const container = process.env.CINCODEBIO_EDITOR_CONTAINER ?? 'cinco-de-bio-editor';

  try {
    const pod = execSync(`${kubectlCommand} get pod -n ${quote(namespace)} -l ${quote(selector)} -o jsonpath='{.items[0].metadata.name}'`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    }).trim();
    if (!pod) {
      return { seeded: false, message: `no editor pod matched ${selector}` };
    }
    execSync(`${kubectlCommand} exec -i -n ${quote(namespace)} -c ${quote(container)} ${quote(pod)} -- sh -lc ${quote(`cat > ${workspacePath}/${fileName}`)}`, {
      input: content,
      stdio: ['pipe', 'ignore', 'pipe']
    });
    return { seeded: true, message: `seeded ${fileName} into ${pod}:${workspacePath}` };
  } catch (error) {
    return {
      seeded: false,
      message: `could not seed ${fileName}; set CINCODEBIO_EDITOR_WORKSPACE_DIR or CINCODEBIO_KUBECTL_COMMAND (${error.message})`
    };
  }
}

function buildStageModel(fullModel, stageIndex) {
  const includedSibs = new Set(stagedSibs.slice(0, stageIndex + 1));
  const containments = fullModel._containments.filter(element => includedSibs.has(element.id));
  const includedElementIds = new Set();
  containments.forEach(element => collectElementIds(element, includedElementIds));

  return {
    ...fullModel,
    id: `${modelBaseName.replaceAll('-', '_')}_step_${String(stageIndex + 1).padStart(2, '0')}`,
    _containments: containments,
    _edges: fullModel._edges.filter(edge => includedElementIds.has(edge.sourceID) && includedElementIds.has(edge.targetID))
  };
}

function collectElementIds(element, ids) {
  ids.add(element.id);
  for (const child of element._containments ?? []) {
    collectElementIds(child, ids);
  }
}

function quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

function normalizeKubectlCommand(command) {
  if (/^docker\s+exec\s+/.test(command) && !/^docker\s+exec\s+.*(?:^|\s)-i(?:\s|$)/.test(command)) {
    return command.replace(/^docker\s+exec\s+/, 'docker exec -i ');
  }
  return command;
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
    return { ok: true, widgetId: widget.id };
  }, filePath);
  expect(opened.ok, opened.message ?? 'failed to open Cinco diagram').toBe(true);
}

async function expectDiagramLabels(page, expectedLabels, diagnostics) {
  await expect.poll(
    async () => page.evaluate(labels => {
      const renderedText = [
        ...Array.from(document.querySelectorAll('svg text')).map(element => element.textContent ?? ''),
        document.body.innerText ?? ''
      ].join('\n');
      return labels.filter(label => !renderedText.includes(label));
    }, expectedLabels),
    { timeout: 60_000, message: diagnostics.join('\n') || `waiting for labels: ${expectedLabels.join(', ')}` }
  ).toEqual([]);
}

async function installRecordingOverlay(page) {
  await page.evaluate(() => {
    const overlay = document.createElement('div');
    overlay.id = 'cdb-recording-step';
    overlay.style.position = 'fixed';
    overlay.style.left = '16px';
    overlay.style.bottom = '16px';
    overlay.style.zIndex = '2147483647';
    overlay.style.padding = '10px 14px';
    overlay.style.background = 'rgba(20, 24, 31, 0.86)';
    overlay.style.color = '#ffffff';
    overlay.style.border = '1px solid rgba(255, 255, 255, 0.22)';
    overlay.style.borderRadius = '6px';
    overlay.style.font = '600 15px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif';
    overlay.style.pointerEvents = 'none';
    overlay.textContent = 'Starting CincoDeBio workflow model';
    document.body.appendChild(overlay);
  });
}

async function updateRecordingOverlay(page, text) {
  await page.evaluate(value => {
    const overlay = document.getElementById('cdb-recording-step');
    if (overlay) {
      overlay.textContent = value;
    }
  }, text);
}