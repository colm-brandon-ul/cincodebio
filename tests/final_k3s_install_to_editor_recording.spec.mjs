import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(testDirectory, '..');
const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/';
const stableVideoPath = 'artifacts/playwright/final-a-k3s-install-to-editor.webm';
const stableScreenshotPath = 'artifacts/playwright/final-a-k3s-install-to-editor.png';
const stableInstallLogPath = 'artifacts/playwright/final-a-install.log';
const readyTimeoutSeconds = Number(process.env.CINCODEBIO_RECORDING_READY_TIMEOUT ?? 2400);

const ansiPattern = /\u001b\[[0-?]*[ -/]*[@-~]/g;

test.use({ video: 'on' });

test('video A records Docker-only k3s install and Theia access', async ({ page }, testInfo) => {
  test.setTimeout((readyTimeoutSeconds + 240) * 1000);
  mkdirSync(path.dirname(stableVideoPath), { recursive: true });
  writeFileSync(stableInstallLogPath, '');

  let outputTail = '';

  try {
    await page.setViewportSize({ width: 1440, height: 900 });
    await installTerminalPage(page);

    await appendTerminal(page, 'host', '$ ./install.sh\n');
    await expectTerminalContains(page, './install.sh');
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

    await appendTerminal(page, 'host', '\n$ open http://localhost/editor/\n');
    await page.evaluate(() => window.setInstallStatus?.('Opening Theia editor at http://localhost/editor/'));
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
    await page.screenshot({ path: stableScreenshotPath, fullPage: true });
    await page.waitForTimeout(2_000);
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
        await testInfo.attach('final-a-install-to-editor-video', { path: stableVideoPath, contentType: 'video/webm' });
      }
    }
  }
});

async function installTerminalPage(page) {
  await page.setContent(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>CincoDeBio Docker install recording</title>
<style>
:root {
  --bg: #101418;
  --panel: #182026;
  --panel-2: #202a31;
  --text: #e6f0ec;
  --muted: #95aaa2;
  --accent: #5bd1a5;
  --warn: #ffc857;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 22%, rgba(91, 209, 165, 0.18), transparent 28rem),
    linear-gradient(135deg, #0f1519 0%, #111a20 44%, #18222a 100%);
  color: var(--text);
  font-family: "Avenir Next", "Trebuchet MS", sans-serif;
}
.shell {
  height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 18px;
  padding: 28px;
}
header {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: 18px;
}
h1 {
  margin: 0;
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0;
}
.status {
  min-width: 360px;
  padding: 14px 18px;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  background: rgba(24,32,38,0.84);
  color: var(--accent);
  font-size: 16px;
}
.terminal {
  min-height: 0;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 8px;
  background: rgba(12,16,20,0.92);
  box-shadow: 0 24px 70px rgba(0,0,0,0.34);
  display: grid;
  grid-template-rows: auto 1fr;
}
.bar {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
  background: var(--panel-2);
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.dot { width: 12px; height: 12px; border-radius: 50%; background: #ff6b6b; }
.dot:nth-child(2) { background: var(--warn); }
.dot:nth-child(3) { background: var(--accent); }
.path { margin-left: 12px; color: var(--muted); font-size: 14px; }
pre {
  min-height: 0;
  margin: 0;
  padding: 22px;
  overflow-y: auto;
  white-space: pre-wrap;
  line-height: 1.42;
  font: 17px/1.42 "SFMono-Regular", Consolas, monospace;
}
.line.host { color: var(--accent); }
.line.stderr { color: #ffb4a6; }
.line.stdout { color: #d7e3df; }
</style>
</head>
<body>
  <main class="shell">
    <header>
      <div>
        <h1>CincoDeBio local install</h1>
        <p>Docker-only k3s all-in-one deployment from the repository installer.</p>
      </div>
      <div id="status" class="status">Preparing install recording</div>
    </header>
    <section class="terminal" aria-label="Install terminal">
      <div class="bar"><span class="dot"></span><span class="dot"></span><span class="dot"></span><span class="path">/cincodebio</span></div>
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
  if (/CincoDeBio deployment complete!|CincoDeBio is ready!/i.test(text)) {
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
      if (/CincoDeBio deployment complete!|CincoDeBio is ready!/i.test(text)) {
        status.textContent = 'Deployment ready';
      } else if (/Waiting for/i.test(text)) {
        status.textContent = text.trim().slice(0, 90);
      }
    };
    window.setInstallStatus = text => { status.textContent = text; };
  });
}

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

  const child = spawn('bash', ['install.sh'], {
    cwd: repositoryRoot,
    env: {
      ...process.env,
      CINCODEBIO_READY_TIMEOUT: String(readyTimeoutSeconds)
    },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const installerTimeoutMs = (readyTimeoutSeconds + 180) * 1000;
  const timeout = setTimeout(() => {
    append('stderr', `\nInstaller did not finish within ${Math.round(installerTimeoutMs / 1000)}s; stopping the installer process group.\n`);
    killInstallerProcess(child);
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

function killInstallerProcess(child) {
  if (!child.pid) return;

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  setTimeout(() => {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }, 5_000).unref();
}

async function appendTerminal(page, source, text) {
  await page.evaluate(({ source, text }) => {
    if (typeof window.appendInstallLog !== 'function') {
      throw new Error('Install terminal appender is not initialized');
    }
    window.appendInstallLog(source, text);
  }, { source, text });
}

async function expectTerminalContains(page, text) {
  await expect(page.locator('#log'), `Install terminal did not render ${text}`).toContainText(text, { timeout: 5_000 });
}

function stripAnsi(value) {
  return value.replace(ansiPattern, '');
}

function normalizeInstallerText(value) {
  return value.replace(/\r+/g, '\n');
}

function visibleInstallerText(value) {
  const visibleLines = value
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line && shouldShowInstallerLine(line));
  return visibleLines.length > 0 ? `${visibleLines.slice(-12).join('\n')}\n` : '';
}

function shouldShowInstallerLine(line) {
  return /^\[(INFO|WARN|ERROR)]/.test(line)
    || /^\[WARN]/.test(line)
    || /^deployment\.|^service\.|^secret\.|^configmap\.|^pod\//.test(line)
    || /CincoDeBio|k3s|Ready|ready|created|configured|condition met|Installing|Deploying|Waiting|Starting/i.test(line)
    || /^#\d+\s+(DONE|ERROR|CACHED|\[[0-9/]+])/.test(line);
}

function tail(value, maxLength) {
  return value.length > maxLength ? value.slice(value.length - maxLength) : value;
}
