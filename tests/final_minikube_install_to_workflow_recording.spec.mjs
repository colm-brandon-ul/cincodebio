import { test, expect, request as playwrightRequest } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * End-to-end proof-of-work for the minikube deployment path:
 *   1. Runs install_minikube.sh (in the cincodebio/ folder) and records terminal output.
 *   2. After install, re-establishes a port-forward on localhost:18080.
 *   3. Opens the Theia editor (Host: localhost header required for nginx-ingress routing).
 *   4. Seeds a TMA workflow, refreshes the SIB library, triggers Generate.
 *   5. Asserts the workflow reaches execution-api and the editor opens the monitoring page.
 *
 * Pass-criteria: script exits 0, editor loads, new workflow appears in /execution-api/ext/get-workflows.
 * Output: artifacts/playwright/final-minikube-install-to-workflow.webm
 *
 * Run:
 *   npm run test:final-minikube-video
 *   # or directly:
 *   CINCODEBIO_MINIKUBE_PROFILE=cincodebio-mk npm run test:final-minikube-video
 */

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(testDirectory, '..');

// minikube must be reachable on localhost:80 (identical to k3s). That requires a
// privileged tunnel running in a separate terminal BEFORE this test:
//     sudo minikube -p cincodebio-mk tunnel
// The editor builds image/workflow URLs from the browser hostname WITHOUT the port,
// so a high-port forward (:18080) cannot serve them — hence the tunnel + localhost:80.
const minikubeProfile = process.env.CINCODEBIO_MINIKUBE_PROFILE ?? 'cincodebio-mk';
const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/';
const appBaseUrl = (process.env.CINCODEBIO_APP_BASE_URL ?? 'http://localhost').replace(/\/+$/, '');
const executionApiBaseUrl = process.env.CINCODEBIO_EXECUTION_API_URL ?? `${appBaseUrl}/execution-api`;
const mkKubectl = `minikube -p ${minikubeProfile} kubectl --`;

const stableVideoPath = 'artifacts/playwright/final-minikube-install-to-workflow.webm';
const stableScreenshotPath = 'artifacts/playwright/final-minikube-install-to-workflow.png';
const stableInstallLogPath = 'artifacts/playwright/final-minikube-install.log';
const readyTimeoutSeconds = Number(process.env.CINCODEBIO_RECORDING_READY_TIMEOUT ?? 3600);

const workspacePath = '/editor/workspace';
const modelFileName = 'generate-tma-workflow.flow';
const modelFilePath = `${workspacePath}/${modelFileName}`;

const ansiPattern = /\[[0-?]*[ -/]*[@-~]/g;

test.use({ video: 'on', ignoreHTTPSErrors: true });

test('minikube: full install and workflow generation proof-of-work', async ({ page, context }, testInfo) => {
  test.setTimeout((readyTimeoutSeconds + 600) * 1000);
  mkdirSync(dirname(stableVideoPath), { recursive: true });
  writeFileSync(stableInstallLogPath, '');

  let outputTail = '';

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installTerminalPage(page);

    await appendTerminal(page, 'host', '$ bash install_minikube.sh\n');
    await expectTerminalContains(page, 'install_minikube.sh');

    const result = await runInstaller(page, (source, chunk) => {
      outputTail = tail(outputTail + chunk, 120_000);
      appendFileSync(stableInstallLogPath, chunk);
      const stream = source === 'stderr' ? process.stderr : process.stdout;
      stream.write(chunk);
    });

    await testInfo.attach('install-output-tail', {
      body: tail(outputTail, 18_000),
      contentType: 'text/plain'
    });
    await testInfo.attach('install-output-full', { path: stableInstallLogPath, contentType: 'text/plain' });
    expect(result.code, tail(outputTail, 18_000)).toBe(0);

    // Require the privileged tunnel so the cluster is on localhost:80 (like k3s).
    // 'sudo minikube -p <profile> tunnel' must already be running — the editor's
    // port-less image/workflow URLs only resolve there (a high-port forward cannot).
    await appendTerminal(page, 'host', `\n$ sudo minikube -p ${minikubeProfile} tunnel   # (run separately)\n`);
    await page.evaluate(() => window.setInstallStatus?.('Checking localhost:80 (minikube tunnel)...'));
    await waitForTunnel(editorUrl);

    await appendTerminal(page, 'host', `\n$ open ${editorUrl}\n`);
    await page.evaluate(() => window.setInstallStatus?.('Opening Theia editor...'));
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });

    await page.evaluate(() => window.setInstallStatus?.('Editor loaded — seeding workflow model'));

    // --- Workflow generation phase ---

    const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

    await test.step('seed the TMA workflow model and reset the SIB library', async () => {
      writeWorkspaceFile(modelFileName, loadFixtureModel());
      resetSibLibraryDirectory();
    });

    const workflowsBefore = await getWorkflowIds(api);

    await test.step('open the workflow diagram', async () => {
      await page.evaluate(() => window.setInstallStatus?.('Opening TMA workflow diagram'));
      await openCincoDiagram(page, modelFilePath);
      await expect(page.getByText(modelFileName, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
      await expect.poll(
        async () => (await getVisibleDiagramCanvasBoxes(page)).length,
        { timeout: 90_000, message: 'waiting for the GLSP diagram canvas' }
      ).toBeGreaterThan(0);
    });

    await test.step('refresh the SIB library from the canvas context menu', async () => {
      await page.evaluate(() => window.setInstallStatus?.('Refreshing SIB Library'));
      const refreshMenuItem = await openCanvasContextMenuItem(page, /^Refresh SIB Library$/);
      await refreshMenuItem.click();
      await expect.poll(
        () => getSibLibraryFileCount(),
        { timeout: 90_000, message: 'waiting for Refresh SIB Library to populate siblib/' }
      ).toBeGreaterThan(0);
    });

    let workflowUrl;
    await test.step('trigger Generate and assert workflow reaches execution-api', async () => {
      await page.evaluate(() => window.setInstallStatus?.('Generating workflow'));
      const spy = await installCommandSpy(page);
      expect(spy.ok, spy.message ?? 'Theia CommandRegistry not found').toBe(true);

      const triggered = await triggerGenerate(page);
      expect(triggered.ok, triggered.message ?? 'failed to trigger Generate').toBe(true);
      await testInfo.attach('generate-trigger', { body: triggered.via ?? '', contentType: 'text/plain' });

      await expect.poll(
        async () => (await getWorkflowIds(api)).filter(id => !workflowsBefore.includes(id)).length,
        { timeout: 90_000, message: 'workflow did not appear in execution-api' }
      ).toBeGreaterThan(0);

      const newIds = (await getWorkflowIds(api)).filter(id => !workflowsBefore.includes(id));
      workflowUrl = `${appBaseUrl}/app/workflows/${newIds[0]}`;
    });

    await test.step('assert the editor opened the workflow URL', async () => {
      const openCall = await expect.poll(
        async () => page.evaluate(() => (window.__cdbCmdCalls ?? []).find(call => call.id === 'mini-browser.openUrl' || call.id === 'simpleBrowser.api.open') ?? null),
        { timeout: 60_000, message: 'waiting for mini-browser.openUrl command call' }
      ).not.toBeNull();
      void openCall;

      const call = await page.evaluate(() => (window.__cdbCmdCalls ?? []).find(c => c.id === 'mini-browser.openUrl' || c.id === 'simpleBrowser.api.open'));
      const openedUrl = JSON.stringify(call?.args ?? []);
      expect(openedUrl, `browser-open args: ${openedUrl}`).toContain('/app/workflows/');

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
      await workflowPage.screenshot({ path: 'artifacts/playwright/final-minikube-workflow-page.png', fullPage: true });
      await workflowPage.close();
    });

    await page.evaluate(() => window.setInstallStatus?.('Workflow generation complete!'));
    await page.screenshot({ path: stableScreenshotPath, fullPage: true });
    await page.waitForTimeout(2_000);

    await api.dispose();
  } finally {
    if (existsSync(stableInstallLogPath)) {
      await testInfo.attach('install-output-full', { path: stableInstallLogPath, contentType: 'text/plain' }).catch(() => undefined);
    }
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
        await testInfo.attach('final-minikube-install-to-workflow-video', { path: stableVideoPath, contentType: 'video/webm' });
      }
    }
  }
});

// ---- Installer terminal UI --------------------------------------------------

async function installTerminalPage(page) {
  await page.setContent(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CincoDeBio minikube install recording</title>
<style>
:root { --bg: #101418; --panel: #182026; --panel-2: #202a31; --text: #e6f0ec; --muted: #95aaa2; --accent: #5bd1a5; --warn: #ffc857; }
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: radial-gradient(circle at 18% 22%, rgba(91,209,165,0.18), transparent 28rem), linear-gradient(135deg,#0f1519 0%,#111a20 44%,#18222a 100%); color: var(--text); font-family: "Avenir Next","Trebuchet MS",sans-serif; }
.shell { height: 100vh; display: grid; grid-template-rows: auto 1fr; gap: 18px; padding: 28px; }
header { display: grid; grid-template-columns: 1fr auto; align-items: end; gap: 18px; }
h1 { margin: 0; font-size: 34px; font-weight: 800; }
.status { min-width: 360px; padding: 14px 18px; border: 1px solid rgba(255,255,255,0.14); border-radius: 8px; background: rgba(24,32,38,0.84); color: var(--accent); font-size: 16px; }
.terminal { min-height: 0; overflow: hidden; border: 1px solid rgba(255,255,255,0.16); border-radius: 8px; background: rgba(12,16,20,0.92); box-shadow: 0 24px 70px rgba(0,0,0,0.34); display: grid; grid-template-rows: auto 1fr; }
.bar { height: 42px; display: flex; align-items: center; gap: 10px; padding: 0 16px; background: var(--panel-2); border-bottom: 1px solid rgba(255,255,255,0.1); }
.dot { width: 12px; height: 12px; border-radius: 50%; background: #ff6b6b; }
.dot:nth-child(2) { background: var(--warn); }
.dot:nth-child(3) { background: var(--accent); }
.path { margin-left: 12px; color: var(--muted); font-size: 14px; }
pre { min-height: 0; margin: 0; padding: 22px; overflow-y: auto; white-space: pre-wrap; line-height: 1.42; font: 17px/1.42 "SFMono-Regular",Consolas,monospace; }
.line.host { color: var(--accent); }
.line.stderr { color: #ffb4a6; }
.line.stdout { color: #d7e3df; }
</style>
</head>
<body>
  <main class="shell">
    <header>
      <div>
        <h1>CincoDeBio minikube install</h1>
        <p>Full minikube deployment — install to workflow generation in a single recording.</p>
      </div>
      <div id="status" class="status">Preparing install recording</div>
    </header>
    <section class="terminal" aria-label="Install terminal">
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="path">/colm</span></div>
      <pre id="log"></pre>
    </section>
  </main>
<script>
const log = document.getElementById('log');
const status = document.getElementById('status');
const lines = [];
window.appendInstallLog = (source, text) => {
  const cls = source === 'stderr' ? 'stderr' : source === 'host' ? 'host' : 'stdout';
  for (const rawLine of text.split(/(\n)/)) {
    if (!rawLine) continue;
    lines.push({ cls, text: rawLine });
  }
  if (lines.length > 160) lines.splice(0, lines.length - 160);
  log.replaceChildren(...lines.map(({ cls, text }) => {
    const span = document.createElement('span');
    span.className = 'line ' + cls;
    span.textContent = text;
    return span;
  }));
  log.scrollTop = log.scrollHeight;
  if (/CincoDeBio.*deployment complete!|CincoDeBio is ready!/i.test(text)) {
    status.textContent = 'Deployment ready';
  } else if (/Waiting for/i.test(text)) {
    status.textContent = text.trim().slice(0, 90);
  }
};
window.setInstallStatus = text => { status.textContent = text; };
</script>
</body>
</html>`);
  await page.evaluate(() => {
    const log = document.getElementById('log');
    const status = document.getElementById('status');
    const lines = [];
    window.appendInstallLog = (source, text) => {
      const cls = source === 'stderr' ? 'stderr' : source === 'host' ? 'host' : 'stdout';
      for (const rawLine of text.split(/(\n)/)) {
        if (!rawLine) continue;
        lines.push({ cls, text: rawLine });
      }
      if (lines.length > 160) lines.splice(0, lines.length - 160);
      log.replaceChildren(...lines.map(({ cls, text }) => {
        const span = document.createElement('span');
        span.className = 'line ' + cls;
        span.textContent = text;
        return span;
      }));
      log.scrollTop = log.scrollHeight;
      if (/CincoDeBio.*deployment complete!|CincoDeBio is ready!/i.test(text)) {
        status.textContent = 'Deployment ready';
      } else if (/Waiting for/i.test(text)) {
        status.textContent = text.trim().slice(0, 90);
      }
    };
    window.setInstallStatus = text => { status.textContent = text; };
  });
}

// ---- Installer process ------------------------------------------------------

async function runInstaller(page, collect) {
  let renderQueue = Promise.resolve();
  const append = (source, data) => {
    const text = normalizeInstallerText(stripAnsi(data.toString()));
    collect(source, text);
    const visibleText = visibleInstallerText(text);
    if (visibleText) {
      renderQueue = renderQueue.then(() => appendTerminal(page, source, visibleText)).catch(() => undefined);
    }
  };

  const child = spawn('bash', ['install_minikube.sh'], {
    cwd: repositoryRoot,
    env: { ...process.env, CINCODEBIO_READY_TIMEOUT: String(readyTimeoutSeconds) },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const installerTimeoutMs = (readyTimeoutSeconds + 300) * 1000;
  const timeout = setTimeout(() => {
    append('stderr', `\nInstaller did not finish within ${Math.round(installerTimeoutMs / 1000)}s; stopping.\n`);
    killProcess(child);
  }, installerTimeoutMs);

  child.stdout.on('data', data => append('stdout', data));
  child.stderr.on('data', data => append('stderr', data));

  const result = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code: signal ? -1 : code, signal }));
  });
  clearTimeout(timeout);
  await renderQueue;
  return result;
}

function killProcess(child) {
  if (!child.pid) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { child.kill('SIGTERM'); }
  setTimeout(() => {
    try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
  }, 5_000).unref();
}

// ---- Terminal UI helpers ----------------------------------------------------

async function appendTerminal(page, source, text) {
  await page.evaluate(({ source, text }) => {
    if (typeof window.appendInstallLog !== 'function') return;
    window.appendInstallLog(source, text);
  }, { source, text });
}

async function expectTerminalContains(page, text) {
  await expect(page.locator('#log'), `Install terminal did not render ${text}`).toContainText(text, { timeout: 5_000 });
}

function stripAnsi(value) { return value.replace(ansiPattern, ''); }
function normalizeInstallerText(value) { return value.replace(/\r+/g, '\n'); }

function visibleInstallerText(value) {
  const visibleLines = value.split('\n')
    .map(line => line.trimEnd())
    .filter(line => line && shouldShowInstallerLine(line));
  return visibleLines.length > 0 ? `${visibleLines.slice(-12).join('\n')}\n` : '';
}

function shouldShowInstallerLine(line) {
  return /^\[(INFO|WARN|ERROR)]/.test(line)
    || /^deployment\.|^service\.|^secret\.|^configmap\.|^pod\//.test(line)
    || /CincoDeBio|k3s|minikube|Ready|ready|created|configured|condition met|Installing|Deploying|Waiting|Starting/i.test(line)
    || /^#\d+\s+(DONE|ERROR|CACHED|\[[0-9/]+])/.test(line);
}

function tail(value, maxLength) {
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Poll localhost:80 until the privileged minikube tunnel serves the editor.
// Fails with an explicit instruction if the tunnel isn't running (it needs sudo).
async function waitForTunnel(url, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  let lastErr = 'no response';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status > 0 && res.status < 500) return;
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e?.message ?? String(e);
    }
    await sleep(3000);
  }
  throw new Error(
    `minikube tunnel not reachable at ${url} (${lastErr}).\n` +
    `Start it first in a separate terminal:  sudo minikube -p ${minikubeProfile} tunnel\n` +
    `(The editor's port-less image/workflow URLs only resolve on localhost:80.)`
  );
}

// ---- Workflow generation helpers (minikube kubectl variant) -----------------

function loadFixtureModel() {
  return readFileSync(join(testDirectory, 'fixtures', 'generate-tma-workflow.flow'), 'utf8')
    .replace('"id": "review_tma_workflow"', '"id": "generate_tma_workflow"');
}

async function getWorkflowIds(api) {
  try {
    const response = await api.get(`${executionApiBaseUrl}/ext/get-workflows`, { timeout: 15_000 });
    if (!response.ok()) return [];
    const body = await response.json();
    return Array.isArray(body) ? body.map(w => String(w.id ?? w._id ?? w.workflow_id ?? '')).filter(Boolean) : [];
  } catch { return []; }
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

function execInEditorPod(command, input) {
  const pod = editorPodName();
  return execSync(`${mkKubectl} exec -i -n ${quote(namespace())} -c ${quote(container())} ${quote(pod)} -- sh -lc ${quote(command)}`, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
}

function editorPodName() {
  const selector = process.env.CINCODEBIO_EDITOR_POD_SELECTOR ?? 'app=cinco-de-bio-editor';
  return execSync(`${mkKubectl} get pod -n ${quote(namespace())} -l ${quote(selector)} -o jsonpath='{.items[0].metadata.name}'`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}

function namespace() { return process.env.CINCODEBIO_EDITOR_NAMESPACE ?? 'default'; }
function container() { return process.env.CINCODEBIO_EDITOR_CONTAINER ?? 'cinco-de-bio-editor'; }

function quote(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

// ---- GLSP / Theia helpers (identical to final_workflow_generation_recording) ----

async function triggerGenerate(page) {
  const viaWidget = await page.evaluate(workspaceRoot => {
    const widget = window.__cincoE2EWidget;
    if (!widget) return { ok: false, reason: 'no opened widget' };
    const isContainer = value => value && typeof value.get === 'function' && value._bindingDictionary;
    const containers = [];
    for (const key of [...Object.keys(widget), 'diContainer', 'container', '_container']) {
      const value = widget[key];
      if (isContainer(value) && !containers.includes(value)) containers.push(value);
    }
    if (containers.length === 0) return { ok: false, reason: 'no GLSP container on widget', widgetKeys: Object.keys(widget) };
    for (const container of containers) {
      const bindings = Array.from(container._bindingDictionary?._map?.entries?.() ?? []);
      const dispatcher = bindings
        .map(([id]) => { try { return container.get(id); } catch { return undefined; } })
        .find(service => service && typeof service.dispatch === 'function' && typeof service.request === 'function' && /ActionDispatcher/.test(service.constructor?.name ?? ''));
      if (dispatcher) {
        const rootId = widget.editorContext?.modelRoot?.id;
        if (!rootId) return { ok: false, reason: 'no model root id' };
        dispatcher.dispatch({ kind: 'cincoGenerate', modelElementId: rootId, targetFolder: workspaceRoot, args: {} });
        return { ok: true, via: 'widget-dispatcher', rootId, dispatcher: dispatcher.constructor?.name };
      }
    }
    return { ok: false, reason: 'no ActionDispatcher in widget container', widgetKeys: Object.keys(widget) };
  }, workspacePath);

  if (viaWidget.ok) return viaWidget;

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
      .map(([id]) => { try { return container.get(id); } catch { return undefined; } })
      .find(service => service && typeof service.executeCommand === 'function' && typeof service.getCommand === 'function' && Array.isArray(service.commands));
    if (!reg) return { ok: false, message: 'CommandRegistry not found' };
    window.__cdbReg = reg;
    window.__cdbCmdCalls = [];
    if (!reg.__cdbWrapped) {
      const original = reg.executeCommand.bind(reg);
      reg.executeCommand = (commandId, ...args) => {
        try { window.__cdbCmdCalls.push({ id: commandId, args }); } catch { /* ignore */ }
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

async function openCincoDiagram(page, filePath) {
  const opened = await page.evaluate(async path => {
    const container = window.theia?.container;
    const bindings = Array.from(container?._bindingDictionary?._map?.entries?.() ?? []);
    const manager = bindings
      .map(([id]) => { try { return container.get(id); } catch { return undefined; } })
      .find(service => service?.constructor?.name === 'CincoGLSPDiagramMananger' && typeof service.doOpen === 'function');
    if (!manager) return { ok: false, message: 'CincoGLSPDiagramMananger not found' };
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    const fileUri = `file://${path}`;
    const uri = {
      scheme: 'file',
      path: {
        base: fileName, name: fileName,
        ext: fileName.includes('.') ? fileName.substring(fileName.lastIndexOf('.')) : '',
        toString: () => path, fsPath: () => path
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
    if (await menuItem.isVisible({ timeout: 2_000 }).catch(() => false)) return menuItem;
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
        return { x: box.x, y: box.y, width: box.width, height: box.height, area: box.width * box.height, visible: style.visibility !== 'hidden' && style.display !== 'none' && box.width > 100 && box.height > 100 };
      })
      .filter(candidate => candidate.visible)
      .sort((left, right) => right.area - left.area);
  });
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
    if (overlay) overlay.textContent = value;
  }, text);
}
