import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const editorUrl = process.env.CINCODEBIO_EDITOR_WORKSPACE_URL ?? 'http://localhost:3000/#/editor/workspace';
const workspacePath = '/editor/workspace';
const exampleFileName = 'example.flow';
const exampleFilePath = `${workspacePath}/${exampleFileName}`;
const testDirectory = dirname(fileURLToPath(import.meta.url));
const stableVideoPath = 'artifacts/playwright/editor-refresh-sib-library.webm';
const stableTracePath = 'artifacts/playwright/editor-refresh-sib-library-trace.zip';

test.use({ video: 'on' });

test('Refresh SIB Library succeeds from the diagram canvas context menu', async ({ page, context }, testInfo) => {
  test.setTimeout(150_000);
  mkdirSync(dirname(stableTracePath), { recursive: true });
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  const diagnostics = [];

  page.on('console', message => diagnostics.push(`console:${message.type()}:${message.text()}`));
  page.on('pageerror', error => diagnostics.push(`pageerror:${error.message}`));
  page.on('requestfailed', request => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? ''}`));
  page.on('response', response => {
    if (response.status() >= 400) {
      diagnostics.push(`http:${response.status()}:${response.url()}`);
    }
  });

  await test.step('create example.flow in the editor workspace', async () => {
    writeWorkspaceFile(exampleFileName, createExampleFlowModelContent());
    resetSibLibraryDirectory();
  });

  await test.step('open the editor workspace and example.flow', async () => {
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 60_000 });

    await openCincoDiagram(page, exampleFilePath);
    await expect(page.getByText(exampleFileName, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
    await expect.poll(
      () => getOpenedCincoGraphRootStatus(page),
      { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for example.flow graph model to load' }
    ).toBe('loaded');
    await expect.poll(
      async () => (await getVisibleDiagramCanvasBoxes(page)).length,
      { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for GLSP diagram SVG' }
    ).toBeGreaterThan(0);
  });

  await test.step('right click the canvas and execute Refresh SIB Library', async () => {
    const refreshMenuItem = await openRefreshSibLibraryContextMenu(page);
    await refreshMenuItem.click();

    try {
      await expect.poll(
        () => getSibLibraryFileCount(),
        { timeout: 60_000, message: 'waiting for Refresh SIB Library to populate siblib/' }
      ).toBeGreaterThan(0);
    } catch (error) {
      const editorLogs = getEditorLogs();
      const sibManagerLogs = getSibManagerLogs();
      await testInfo.attach('editor-logs-on-refresh-failure', { body: editorLogs || 'no editor logs', contentType: 'text/plain' });
      await testInfo.attach('sib-manager-logs-on-refresh-failure', { body: sibManagerLogs || 'no sib-manager logs', contentType: 'text/plain' });
      throw error;
    }
  });

  const editorLogs = getEditorLogs();
  const sibManagerLogs = getSibManagerLogs();
  await testInfo.attach('browser-diagnostics', {
    body: diagnostics.join('\n') || 'no diagnostics',
    contentType: 'text/plain'
  });
  await testInfo.attach('editor-logs', { body: editorLogs || 'no editor logs', contentType: 'text/plain' });
  await testInfo.attach('sib-manager-logs', { body: sibManagerLogs || 'no sib-manager logs', contentType: 'text/plain' });
  await page.screenshot({ path: 'artifacts/playwright/editor-refresh-sib-library.png', fullPage: true });

  const allDiagnostics = [diagnostics.join('\n'), editorLogs, sibManagerLogs].filter(Boolean).join('\n');
  const blockingDiagnostics = allDiagnostics
    .split('\n')
    .filter(line => /Error executing handler: SyncSibLibraryWithBackEnd|SyncSibLibraryWithBackEnd ran into errors|Cannot read properties of undefined \(reading 'join'\)|ReferenceError: THEIA_FOLDER|ECONNREFUSED.*(sib-manager|localhost:8081)|localhost:8081|HTTP error! status|There was a problem with the fetch operation|cinco-diagram.*(failed|closed)/i.test(line));
  expect(blockingDiagnostics, allDiagnostics || 'no diagnostics').toHaveLength(0);

  await context.tracing.stop({ path: stableTracePath });
  await testInfo.attach('refresh-sib-library-trace', { path: stableTracePath, contentType: 'application/zip' });
  const video = page.video();
  await page.close();
  if (video) {
    const sourceVideoPath = await video.path();
    mkdirSync(dirname(stableVideoPath), { recursive: true });
    copyFileSync(sourceVideoPath, stableVideoPath);
    await testInfo.attach('refresh-sib-library-video', { path: stableVideoPath, contentType: 'video/webm' });
  }
});

function createExampleFlowModelContent() {
  return readFileSync(join(testDirectory, 'fixtures', 'review-tma-workflow.flow'), 'utf8')
    .replace('"id": "review_tma_workflow"', '"id": "example"');
}

function writeWorkspaceFile(fileName, content) {
  const hostWorkspace = process.env.CINCODEBIO_EDITOR_WORKSPACE_DIR;
  if (hostWorkspace) {
    execSync(`mkdir -p ${quote(hostWorkspace)}`);
    execSync(`cat > ${quote(`${hostWorkspace}/${fileName}`)}`, { input: content, stdio: ['pipe', 'ignore', 'pipe'] });
    return;
  }

  execInEditorPod(`mkdir -p ${quote(workspacePath)} && cat > ${quote(`${workspacePath}/${fileName}`)}`, content);
}

function resetSibLibraryDirectory() {
  const hostWorkspace = process.env.CINCODEBIO_EDITOR_WORKSPACE_DIR;
  if (hostWorkspace) {
    execSync(`rm -rf ${quote(`${hostWorkspace}/.siblib`)} ${quote(`${hostWorkspace}/siblib`)} && mkdir -p ${quote(`${hostWorkspace}/siblib`)}`);
    return;
  }

  execInEditorPod(`rm -rf ${quote(`${workspacePath}/.siblib`)} ${quote(`${workspacePath}/siblib`)} && mkdir -p ${quote(`${workspacePath}/siblib`)}`);
}

function getSibLibraryFileCount() {
  const hostWorkspace = process.env.CINCODEBIO_EDITOR_WORKSPACE_DIR;
  if (hostWorkspace) {
    return Number(execSync(`find ${quote(`${hostWorkspace}/siblib`)} -type f | wc -l`, { encoding: 'utf8' }).trim());
  }

  return Number(execInEditorPod(`find ${quote(`${workspacePath}/siblib`)} -type f | wc -l`).trim());
}

async function openRefreshSibLibraryContextMenu(page) {
  await expect.poll(
    async () => (await getVisibleDiagramCanvasBoxes(page)).length,
    { timeout: 60_000, message: 'waiting for a visible GLSP diagram canvas' }
  ).toBeGreaterThan(0);
  await page.getByText('Model loading in progress').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);

  const refreshMenuItem = page
    .locator('.p-Menu .p-Menu-itemLabel, .lm-Menu .lm-Menu-itemLabel, [role="menuitem"]')
    .filter({ hasText: /^Refresh SIB Library$/ })
    .first();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(500);

    const box = await getLargestDiagramCanvasBox(page);
    expect(box, 'diagram canvas has a bounding box').not.toBeNull();
    await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20, { button: 'right' });

    if (await refreshMenuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return refreshMenuItem;
    }
  }

  const visibleMenuText = await page.locator('.p-Menu, .lm-Menu, [role="menu"]').allInnerTexts().catch(() => []);
  const canvasBoxes = await getVisibleDiagramCanvasBoxes(page);
  throw new Error(`Refresh SIB Library was not visible in the canvas context menu. Visible menus: ${visibleMenuText.join('\n---\n')}. Canvas candidates: ${JSON.stringify(canvasBoxes)}`);
}

async function getOpenedCincoGraphRootStatus(page) {
  return page.evaluate(() => {
    const rootType = window.__cincoE2EWidget?.editorContext?.modelRoot?.type;
    return rootType && rootType !== 'NONE' ? 'loaded' : (rootType ?? 'missing');
  });
}

async function getLargestDiagramCanvasBox(page) {
  const boxes = await getVisibleDiagramCanvasBoxes(page);
  return boxes[0] ?? null;
}

async function getVisibleDiagramCanvasBoxes(page) {
  return page.evaluate(() => {
    const selectors = [
      'svg.sprotty-graph',
      '.sprotty',
      '.sprotty svg',
      '[class*="sprotty"] svg',
      '.react-flow',
      '.react-flow__pane',
      '[class*="diagram"] svg',
      '[class*="diagram"] canvas',
      'canvas'
    ];
    const elements = Array.from(new Set(selectors.flatMap(selector => Array.from(document.querySelectorAll(selector)))));
    return elements
      .map((element, index) => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
          index,
          tagName: element.tagName.toLowerCase(),
          id: element.id,
          className: String(element.getAttribute('class') ?? ''),
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          area: box.width * box.height,
          visible: style.visibility !== 'hidden' && style.display !== 'none' && box.width > 100 && box.height > 100
        };
      })
      .filter(candidate => candidate.visible)
      .sort((left, right) => right.area - left.area);
  });
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
    await manager.doOpen(widget, uri, { mode: 'activate' });
    window.__cincoE2EWidget = widget;
    return { ok: true, widgetId: widget.id };
  }, filePath);
  expect(opened.ok, opened.message ?? 'failed to open Cinco diagram').toBe(true);
}

function getEditorLogs() {
  return kubectl(['logs', '-n', namespace(), 'deploy/cinco-de-bio-editor', '-c', container(), '--since=3m', '--tail=300']);
}

function getSibManagerLogs() {
  return kubectl(['logs', '-n', namespace(), 'deploy/sib-manager', '--since=3m', '--tail=300']);
}

function execInEditorPod(command, input) {
  const pod = editorPodName();
  return execSync(`${kubectlCommand()} exec -i -n ${quote(namespace())} -c ${quote(container())} ${quote(pod)} -- sh -lc ${quote(command)}`, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function editorPodName() {
  const selector = process.env.CINCODEBIO_EDITOR_POD_SELECTOR ?? 'app=cinco-de-bio-editor';
  return execSync(`${kubectlCommand()} get pod -n ${quote(namespace())} -l ${quote(selector)} -o jsonpath='{.items[0].metadata.name}'`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function kubectl(args) {
  try {
    return execSync(`${kubectlCommand()} ${args.map(quote).join(' ')}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
  } catch (error) {
    return [error.stdout, error.stderr, error.message].filter(Boolean).join('\n');
  }
}

function namespace() {
  return process.env.CINCODEBIO_EDITOR_NAMESPACE ?? 'default';
}

function container() {
  return process.env.CINCODEBIO_EDITOR_CONTAINER ?? 'cinco-de-bio-editor';
}

function kubectlCommand() {
  return normalizeKubectlCommand(process.env.CINCODEBIO_KUBECTL_COMMAND ?? 'kubectl');
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