import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editorUrl = process.env.CINCODEBIO_EDITOR_WORKSPACE_URL ?? 'http://localhost:3000/#/editor/workspace';
const workspacePath = '/editor/workspace';
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '..');
const editorWorkspaceRoot = path.join(repositoryRoot, 'cinco-de-bio-editor', 'workspace');
const semanticModelFileName = 'semantic-coverage.flow';
const sibLibraryFileName = 'sib-library-example.sibs';
const semanticModelPath = `${workspacePath}/${semanticModelFileName}`;
const stableVideoPath = 'artifacts/playwright/editor-semantic-coverage.webm';
const stableTracePath = 'artifacts/playwright/editor-semantic-coverage-trace.zip';

const expectedLabels = [
  'Review Input Images',
  'Run Segmentation',
  'Export Results'
];

test.use({ video: 'on' });

test('semantic runtime surfaces work for hooks, handlers, context menus, and rendering', async ({ page, context }, testInfo) => {
  test.setTimeout(180_000);
  mkdirSync(path.dirname(stableTracePath), { recursive: true });
  await disableBrowserCache(context, page);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  let traceStopped = false;

  const diagnostics = [];
  page.on('console', message => diagnostics.push(`console:${message.type()}:${message.text()}`));
  page.on('pageerror', error => diagnostics.push(`pageerror:${error.message}\n${error.stack ?? ''}`));
  page.on('requestfailed', request => diagnostics.push(`requestfailed:${request.url()}:${request.failure()?.errorText ?? ''}`));
  page.on('response', response => {
    if (response.status() >= 400) {
      diagnostics.push(`http:${response.status()}:${response.url()}`);
    }
  });

  try {
    await test.step('seed semantic example models into the editor workspace', async () => {
      writeWorkspaceFile(semanticModelFileName, readFileSync(path.join(editorWorkspaceRoot, semanticModelFileName), 'utf8'));
      writeWorkspaceFile(sibLibraryFileName, readFileSync(path.join(editorWorkspaceRoot, sibLibraryFileName), 'utf8'));
    });

    await test.step('open semantic-coverage.flow and wait for a real GLSP model', async () => {
      await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
      await expect(page.locator('body')).toContainText('File', { timeout: 60_000 });
      await openCincoDiagram(page, semanticModelPath);
      await expect(page.getByText(semanticModelFileName, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
      await expect.poll(
        () => getOpenedCincoGraphRootStatus(page),
        { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for semantic-coverage.flow graph model to load' }
      ).toBe('loaded');
      await expect.poll(
        async () => (await getVisibleDiagramCanvasBoxes(page)).length,
        { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for visible GLSP diagram canvas' }
      ).toBeGreaterThan(0);
    });

    await test.step('verify model rendering exercises appearance providers and hooks', async () => {
      await expectDiagramLabels(page, expectedLabels, diagnostics);
      const rendered = await diagramText(page);
      expect(rendered).toContain('Run Segmentation');
      expect(rendered).toContain('Export Results');
      await page.screenshot({ path: 'artifacts/playwright/editor-semantic-coverage-opened.png', fullPage: true });
    });

    await test.step('verify graph-level custom action context menu is present', async () => {
      const refreshMenuItem = await openContextMenuAtCanvas(page, /^Refresh SIB Library$/);
      await expect(refreshMenuItem).toBeVisible();
      await page.keyboard.press('Escape');
    });

    await test.step('verify SIB-level custom action context menu is present and executable', async () => {
      const refreshSibMenuItem = await openContextMenuOnDiagramText(page, 'Run Segmentation', /^Refresh SIB$/);
      await refreshSibMenuItem.click();
      await page.waitForTimeout(1_000);
    });

    await test.step('capture editor and backend logs after semantic coverage exercise', async () => {
      await testInfo.attach('browser-diagnostics', { body: diagnostics.join('\n') || 'no diagnostics', contentType: 'text/plain' });
      await testInfo.attach('editor-logs', { body: getEditorLogs() || 'no editor logs', contentType: 'text/plain' });
      await testInfo.attach('sib-manager-logs', { body: getSibManagerLogs() || 'no sib-manager logs', contentType: 'text/plain' });
    });

    const blockingDiagnostics = diagnostics.filter(line => /workspace could not be found|cinco-diagram.*(failed|error|closed)|Error executing handler|Cannot read properties of undefined/i.test(line));
    expect(blockingDiagnostics, diagnostics.join('\n')).toHaveLength(0);

    await context.tracing.stop({ path: stableTracePath });
    traceStopped = true;
    await testInfo.attach('semantic-coverage-trace', { path: stableTracePath, contentType: 'application/zip' });
  } finally {
    if (!traceStopped) {
      try {
        await context.tracing.stop({ path: stableTracePath });
        traceStopped = true;
      } catch {
        traceStopped = false;
      }
      if (traceStopped && existsSync(stableTracePath)) {
        await testInfo.attach('semantic-coverage-trace', { path: stableTracePath, contentType: 'application/zip' }).catch(() => undefined);
      }
    }

    const video = page.video();
    await page.close().catch(() => undefined);
    if (video) {
      const sourceVideoPath = await video.path();
      mkdirSync(path.dirname(stableVideoPath), { recursive: true });
      copyFileSync(sourceVideoPath, stableVideoPath);
      await testInfo.attach('semantic-coverage-video', { path: stableVideoPath, contentType: 'video/webm' });
    }
  }
});

async function disableBrowserCache(context, page) {
  const session = await context.newCDPSession(page).catch(() => undefined);
  if (session) {
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
  }
}

function writeWorkspaceFile(fileName, content) {
  const hostWorkspace = process.env.CINCODEBIO_EDITOR_WORKSPACE_DIR;
  if (hostWorkspace) {
    mkdirSync(hostWorkspace, { recursive: true });
    writeFileSync(path.join(hostWorkspace, fileName), content);
    return;
  }

  execInEditorPod(`cat > ${quote(`${workspacePath}/${fileName}`)}`, content);
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

async function getOpenedCincoGraphRootStatus(page) {
  return page.evaluate(() => {
    const rootType = window.__cincoE2EWidget?.editorContext?.modelRoot?.type;
    return rootType && rootType !== 'NONE' ? 'loaded' : (rootType ?? 'missing');
  });
}

async function expectDiagramLabels(page, labels, diagnostics) {
  await expect.poll(
    async () => {
      const rendered = await diagramText(page);
      return labels.filter(label => !rendered.includes(label));
    },
    { timeout: 60_000, message: diagnostics.join('\n') || `waiting for labels ${labels.join(', ')}` }
  ).toEqual([]);
}

async function diagramText(page) {
  return page.evaluate(() => [
    ...Array.from(document.querySelectorAll('svg text')).map(element => element.textContent ?? ''),
    document.body.innerText ?? ''
  ].join('\n'));
}

async function openContextMenuAtCanvas(page, labelPattern) {
  const menuItem = page
    .locator('.p-Menu .p-Menu-itemLabel, .lm-Menu .lm-Menu-itemLabel, [role="menuitem"]')
    .filter({ hasText: labelPattern })
    .first();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(400);
    const box = await getLargestDiagramCanvasBox(page);
    expect(box, 'diagram canvas has a bounding box').not.toBeNull();
    await page.mouse.click(box.x + box.width - 24, box.y + box.height - 24, { button: 'right' });
    if (await menuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return menuItem;
    }
  }

  await throwContextMenuError(page, labelPattern);
}

async function openContextMenuOnDiagramText(page, text, labelPattern) {
  const menuItem = page
    .locator('.p-Menu .p-Menu-itemLabel, .lm-Menu .lm-Menu-itemLabel, [role="menuitem"]')
    .filter({ hasText: labelPattern })
    .first();
  const textLocator = page.locator('svg text').filter({ hasText: text }).first();
  await expect(textLocator).toBeVisible({ timeout: 60_000 });

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(400);
    const box = await textLocator.boundingBox();
    expect(box, `diagram text ${text} has a bounding box`).not.toBeNull();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    if (await menuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return menuItem;
    }
  }

  await throwContextMenuError(page, labelPattern);
}

async function throwContextMenuError(page, labelPattern) {
  const visibleMenuText = await page.locator('.p-Menu, .lm-Menu, [role="menu"]').allInnerTexts().catch(() => []);
  const canvasBoxes = await getVisibleDiagramCanvasBoxes(page);
  throw new Error(`Context menu item ${labelPattern} was not visible. Visible menus: ${visibleMenuText.join('\n---\n')}. Canvas candidates: ${JSON.stringify(canvasBoxes)}`);
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

function getEditorLogs() {
  return kubectl(['logs', '-n', namespace(), 'deploy/cinco-de-bio-editor', '-c', container(), '--since=3m', '--tail=400']);
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
