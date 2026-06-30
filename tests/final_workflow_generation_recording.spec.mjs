import { test, expect, request as playwrightRequest } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end proof that workflow GENERATION / EXECUTION works from the editor:
 *   1. seed a complete TMA workflow .flow into the editor workspace
 *   2. refresh the SIB library (so the server-side validateSibLibrary() passes)
 *   3. trigger the "Generate Graph" command
 *   4. assert the model was submitted to execution-api (a new workflow appears in
 *      /execution-api/ext/get-workflows) -- this exercises the /ext URL fix
 *   5. assert the editor opened the returned workflow URL in Theia's Simple Browser
 *      (the `executeCommand('simpleBrowser.api.open', [response.url])` line)
 *   6. open the workflow monitoring page and confirm it renders
 *
 * Run against a k3s deployment:
 *   CINCODEBIO_EDITOR_URL=http://localhost/editor/ \
 *   CINCODEBIO_APP_BASE_URL=http://localhost \
 *   CINCODEBIO_KUBECTL_COMMAND='docker exec -i cincodebio kubectl' \
 *   npm run test:final-workflow-generation
 */

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/';
const appBaseUrl = (process.env.CINCODEBIO_APP_BASE_URL ?? 'http://localhost').replace(/\/+$/, '');
const executionApiBaseUrl = process.env.CINCODEBIO_EXECUTION_API_URL ?? `${appBaseUrl}/execution-api`;
const workspacePath = '/editor/workspace';
const modelFileName = 'generate-tma-workflow.flow';
const modelFilePath = `${workspacePath}/${modelFileName}`;
const testDirectory = dirname(fileURLToPath(import.meta.url));
const stableVideoPath = 'artifacts/playwright/final-workflow-generation.webm';
const stableTracePath = 'artifacts/playwright/final-workflow-generation-trace.zip';

test.use({ video: 'on', ignoreHTTPSErrors: true });

test('generates a workflow from the editor and opens it in the Simple Browser', async ({ page, context }, testInfo) => {
  test.setTimeout(240_000);
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

  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  await test.step('seed the TMA workflow model and reset the SIB library', async () => {
    writeWorkspaceFile(modelFileName, loadFixtureModel());
    resetSibLibraryDirectory();
  });

  const workflowsBefore = await getWorkflowIds(api);

  await test.step('open the editor and the workflow diagram', async () => {
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 60_000 });
    await installRecordingOverlay(page, 'Opening TMA workflow');

    await openCincoDiagram(page, modelFilePath);
    await expect(page.getByText(modelFileName, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
    await expect.poll(
      async () => (await getVisibleDiagramCanvasBoxes(page)).length,
      { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for the GLSP diagram canvas' }
    ).toBeGreaterThan(0);
  });

  await test.step('refresh the SIB library from the canvas context menu', async () => {
    await updateRecordingOverlay(page, 'Refreshing SIB Library');
    const refreshMenuItem = await openCanvasContextMenuItem(page, /^Refresh SIB Library$/);
    await refreshMenuItem.click();
    await expect.poll(
      () => getSibLibraryFileCount(),
      { timeout: 90_000, message: 'waiting for Refresh SIB Library to populate siblib/' }
    ).toBeGreaterThan(0);
  });

  await test.step('install a command spy and trigger Generate', async () => {
    await updateRecordingOverlay(page, 'Generating workflow');
    // The server-side generator asks the client to open the workflow URL via a CommandAction.
    // Spy on the Theia CommandRegistry so we can prove that fired with the workflow URL.
    const spy = await installCommandSpy(page);
    expect(spy.ok, spy.message ?? 'Theia CommandRegistry not found').toBe(true);

    const triggered = await triggerGenerate(page);
    expect(triggered.ok, triggered.message ?? 'failed to trigger Generate').toBe(true);
    await testInfo.attach('generate-trigger', { body: triggered.via ?? '', contentType: 'text/plain' });
  });

  let workflowUrl;
  await test.step('assert the model reached execution-api (a new workflow appears)', async () => {
    await expect.poll(
      async () => (await getWorkflowIds(api)).filter(id => !workflowsBefore.includes(id)).length,
      { timeout: 90_000, message: () => `editor diagnostics:\n${diagnostics.join('\n')}\n\neditor logs:\n${getEditorLogs()}` }
    ).toBeGreaterThan(0);
    const newIds = (await getWorkflowIds(api)).filter(id => !workflowsBefore.includes(id));
    workflowUrl = `${appBaseUrl}/app/workflows/${newIds[0]}`;
  });

  await test.step('assert the editor opened the workflow URL in the in-editor browser', async () => {
    // The generator asks the client to open the workflow URL via a CommandAction. This build
    // ships Theia's MiniBrowser (mini-browser.openUrl); VS Code's Simple Browser is not deployed.
    const openCall = await expect.poll(
      async () => page.evaluate(() => (window.__cdbCmdCalls ?? []).find(call => call.id === 'mini-browser.openUrl' || call.id === 'simpleBrowser.api.open') ?? null),
      { timeout: 60_000, message: () => `command calls: ${JSON.stringify(diagnostics)}` }
    ).not.toBeNull();
    void openCall;

    const call = await page.evaluate(() => (window.__cdbCmdCalls ?? []).find(c => c.id === 'mini-browser.openUrl' || c.id === 'simpleBrowser.api.open'));
    const openedUrl = JSON.stringify(call?.args ?? []);
    expect(openedUrl, `browser-open args: ${openedUrl}`).toContain('/app/workflows/');

    // The MiniBrowser widget materialises with the Theia `theia-mini-browser` class (its iframe
    // src is proxied, so we match the widget/tab rather than the literal URL).
    await expect.poll(
      async () => page.evaluate(() => {
        const widgetHit = document.querySelector('.theia-mini-browser, [class*="mini-browser"]') !== null;
        const tabHit = Array.from(document.querySelectorAll('.p-TabBar-tabLabel, .lm-TabBar-tabLabel'))
          .some(node => /(simple|mini).*browser/i.test(node.textContent ?? ''));
        return widgetHit || tabHit;
      }),
      { timeout: 60_000, message: 'waiting for the MiniBrowser widget to open' }
    ).toBe(true);
  });

  await test.step('open the workflow monitoring page and confirm it renders', async () => {
    const workflowPage = await context.newPage();
    const response = await workflowPage.goto(workflowUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);
    expect(response?.status() ?? 0, `workflow page ${workflowUrl}`).toBeLessThan(400);
    await workflowPage.screenshot({ path: 'artifacts/playwright/final-workflow-generation-workflow-page.png', fullPage: true });
    await workflowPage.close();
  });

  await page.screenshot({ path: 'artifacts/playwright/final-workflow-generation.png', fullPage: true });
  await testInfo.attach('diagnostics', { body: diagnostics.join('\n') || 'no diagnostics', contentType: 'text/plain' });
  await testInfo.attach('editor-logs', { body: getEditorLogs() || 'no editor logs', contentType: 'text/plain' });

  await api.dispose();
  await context.tracing.stop({ path: stableTracePath });
  await testInfo.attach('generation-trace', { path: stableTracePath, contentType: 'application/zip' });

  const video = page.video();
  await page.close();
  if (video) {
    const sourceVideoPath = await video.path();
    mkdirSync(dirname(stableVideoPath), { recursive: true });
    copyFileSync(sourceVideoPath, stableVideoPath);
    await testInfo.attach('generation-video', { path: stableVideoPath, contentType: 'video/webm' });
  }
});

function loadFixtureModel() {
  // generate-tma-workflow.flow carries prime references that resolve against the deployed
  // SIB library (real SIBDef ids), so the model passes the editor's validation before submit.
  return readFileSync(join(testDirectory, 'fixtures', 'generate-tma-workflow.flow'), 'utf8')
    .replace('"id": "review_tma_workflow"', '"id": "generate_tma_workflow"');
}

async function getWorkflowIds(api) {
  try {
    const response = await api.get(`${executionApiBaseUrl}/ext/get-workflows`, { timeout: 15_000 });
    if (!response.ok()) {
      return [];
    }
    const body = await response.json();
    return Array.isArray(body) ? body.map(workflow => String(workflow.id ?? workflow._id ?? workflow.workflow_id ?? '')).filter(Boolean) : [];
  } catch {
    return [];
  }
}

async function triggerGenerate(page) {
  // Preferred: dispatch the GeneratorAction ('cincoGenerate') through the opened diagram
  // widget's OWN GLSP action dispatcher. The generate palette button instead uses the
  // environment-provider's injected dispatcher, which can be stale when the diagram is opened
  // programmatically (the GLSP client re-initialises), so the action never reaches the server.
  const viaWidget = await page.evaluate(workspaceRoot => {
    const widget = window.__cincoE2EWidget;
    if (!widget) {
      return { ok: false, reason: 'no opened widget' };
    }
    const isContainer = value => value && typeof value.get === 'function' && value._bindingDictionary;
    const containers = [];
    for (const key of [...Object.keys(widget), 'diContainer', 'container', '_container']) {
      const value = widget[key];
      if (isContainer(value) && !containers.includes(value)) {
        containers.push(value);
      }
    }
    if (containers.length === 0) {
      return { ok: false, reason: 'no GLSP container on widget', widgetKeys: Object.keys(widget) };
    }
    for (const container of containers) {
      const bindings = Array.from(container._bindingDictionary?._map?.entries?.() ?? []);
      const dispatcher = bindings
        .map(([id]) => {
          try {
            return container.get(id);
          } catch {
            return undefined;
          }
        })
        .find(service => service && typeof service.dispatch === 'function' && typeof service.request === 'function' && /ActionDispatcher/.test(service.constructor?.name ?? ''));
      if (dispatcher) {
        const rootId = widget.editorContext?.modelRoot?.id;
        if (!rootId) {
          return { ok: false, reason: 'no model root id' };
        }
        dispatcher.dispatch({ kind: 'cincoGenerate', modelElementId: rootId, targetFolder: workspaceRoot, args: {} });
        return { ok: true, via: 'widget-dispatcher', rootId, dispatcher: dispatcher.constructor?.name };
      }
    }
    return { ok: false, reason: 'no ActionDispatcher in widget container', widgetKeys: Object.keys(widget) };
  }, workspacePath);

  if (viaWidget.ok) {
    return viaWidget;
  }

  // Fallback: click the generate palette tool button.
  const generateButton = page.locator('[id="cinco.generate-tool"], [title="Generate"]').first();
  if (await generateButton.isVisible({ timeout: 15_000 }).catch(() => false)) {
    await generateButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await generateButton.click({ force: true });
    return { ok: true, via: 'palette-button', widgetProbe: JSON.stringify(viaWidget) };
  }
  return { ok: false, message: 'no widget dispatcher and no Generate button: ' + JSON.stringify(viaWidget) };
}

async function installCommandSpy(page) {
  return page.evaluate(() => {
    const container = window.theia?.container;
    const bindings = Array.from(container?._bindingDictionary?._map?.entries?.() ?? []);
    const reg = bindings
      .map(([id]) => {
        try {
          return container.get(id);
        } catch {
          return undefined;
        }
      })
      .find(service => service && typeof service.executeCommand === 'function' && typeof service.getCommand === 'function' && Array.isArray(service.commands));
    if (!reg) {
      return { ok: false, message: 'CommandRegistry not found' };
    }
    window.__cdbReg = reg;
    window.__cdbCmdCalls = [];
    if (!reg.__cdbWrapped) {
      const original = reg.executeCommand.bind(reg);
      reg.executeCommand = (commandId, ...args) => {
        try {
          window.__cdbCmdCalls.push({ id: commandId, args });
        } catch {
          /* ignore */
        }
        return original(commandId, ...args);
      };
      reg.__cdbWrapped = true;
    }
    return {
      ok: true,
      hasGenerate: reg.commands.some(command => command.id === 'GenerateGraphDiagram.command'),
      sample: reg.commands.map(command => command.id).filter(id => /generat/i.test(id)).join(',')
    };
  });
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

async function openCanvasContextMenuItem(page, labelRegex) {
  await expect.poll(
    async () => (await getVisibleDiagramCanvasBoxes(page)).length,
    { timeout: 60_000, message: 'waiting for a visible GLSP diagram canvas' }
  ).toBeGreaterThan(0);
  await page.getByText('Model loading in progress').waitFor({ state: 'detached', timeout: 30_000 }).catch(() => undefined);

  const menuItem = page
    .locator('.p-Menu .p-Menu-itemLabel, .lm-Menu .lm-Menu-itemLabel, [role="menuitem"]')
    .filter({ hasText: labelRegex })
    .first();

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(500);
    const box = (await getVisibleDiagramCanvasBoxes(page))[0];
    expect(box, 'diagram canvas has a bounding box').toBeTruthy();
    await page.mouse.click(box.x + box.width - 20, box.y + box.height - 20, { button: 'right' });
    if (await menuItem.isVisible({ timeout: 2_000 }).catch(() => false)) {
      return menuItem;
    }
  }
  const visibleMenuText = await page.locator('.p-Menu, .lm-Menu, [role="menu"]').allInnerTexts().catch(() => []);
  throw new Error(`Context menu item ${labelRegex} not found. Visible menus: ${visibleMenuText.join('\n---\n')}`);
}

async function getVisibleDiagramCanvasBoxes(page) {
  return page.evaluate(() => {
    const selectors = ['svg.sprotty-graph', '.sprotty', '.sprotty svg', '[class*="sprotty"] svg', '[class*="diagram"] svg', '[class*="diagram"] canvas', 'canvas'];
    const elements = Array.from(new Set(selectors.flatMap(selector => Array.from(document.querySelectorAll(selector)))));
    return elements
      .map(element => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return {
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

async function installRecordingOverlay(page, text) {
  await page.evaluate(value => {
    const overlay = document.createElement('div');
    overlay.id = 'cdb-recording-step';
    overlay.style.cssText = 'position:fixed;left:16px;bottom:16px;z-index:2147483647;padding:10px 14px;background:rgba(20,24,31,0.86);color:#fff;border:1px solid rgba(255,255,255,0.22);border-radius:6px;font:600 15px system-ui,sans-serif;pointer-events:none;';
    overlay.textContent = value;
    document.body.appendChild(overlay);
  }, text);
}

async function updateRecordingOverlay(page, text) {
  await page.evaluate(value => {
    const overlay = document.getElementById('cdb-recording-step');
    if (overlay) {
      overlay.textContent = value;
    }
  }, text);
}

function getEditorLogs() {
  return kubectl(['logs', '-n', namespace(), 'deploy/cinco-de-bio-editor', '-c', container(), '--since=5m', '--tail=400']);
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
    return execSync(`${kubectlCommand()} ${args.map(quote).join(' ')}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
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
