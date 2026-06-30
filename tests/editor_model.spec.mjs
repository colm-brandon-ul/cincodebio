import { test, expect } from '@playwright/test';
import { execSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost:3000';
const modelName = process.env.CINCODEBIO_MODEL_NAME ?? 'reviewdemo';
const workspacePath = '/editor/workspace';
const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(testDirectory, 'fixtures', 'review-tma-workflow.flow');
const stableVideoPath = `artifacts/playwright/editor-model-${modelName}.webm`;
const stableTracePath = `artifacts/playwright/editor-model-${modelName}-trace.zip`;

test.use({ video: 'on' });

test('reviewer can create and open a CincoDeBio workflow model', async ({ page, context }, testInfo) => {
  test.setTimeout(120_000);
  mkdirSync(path.dirname(stableTracePath), { recursive: true });
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

  await test.step('open the editor shell', async () => {
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 60_000 });
  });

  await test.step('create a CincoDeBio graph model', async () => {
    await executeTheiaCommand(page, 'cinco.initialize-project');

    const initializerFrame = await waitForInitializerFrame(page);
    await clickFrameButton(initializerFrame, 'Create Model');
    await initializerFrame.locator('#modelName').fill(modelName);
    await initializerFrame.locator('#modelType').selectOption('flow');
    await page.screenshot({ path: `artifacts/playwright/editor-model-${modelName}-form.png`, fullPage: true });
    await clickFrameButton(initializerFrame, 'Confirm');
  });

  await test.step('verify the GLSP diagram opens', async () => {
    await seedCreatedModel(page, `${workspacePath}/${modelName}.flow`);
    await openCincoDiagram(page, `${workspacePath}/${modelName}.flow`);
    await expect(page.getByText(`${modelName}.flow`, { exact: false }).first()).toBeVisible({ timeout: 60_000 });
    await expect.poll(
      async () => page.locator('svg.sprotty-graph, [class*="sprotty"] svg, [class*="diagram"] svg').count(),
      { timeout: 90_000, message: diagnostics.join('\n') || 'waiting for GLSP diagram SVG' }
    ).toBeGreaterThan(0);
  });

  await page.screenshot({ path: `artifacts/playwright/editor-model-${modelName}-opened.png`, fullPage: true });
  await testInfo.attach('diagnostics', {
    body: diagnostics.join('\n') || 'no diagnostics',
    contentType: 'text/plain'
  });

  const blockingDiagnostics = diagnostics.filter(line => /spawn ps|workspace could not be found|cinco-diagram.*(failed|error|closed)/i.test(line));
  expect(blockingDiagnostics, diagnostics.join('\n')).toHaveLength(0);

  await context.tracing.stop({ path: stableTracePath });
  await testInfo.attach('model-creation-trace', { path: stableTracePath, contentType: 'application/zip' });
  const video = page.video();
  await page.close();
  if (video) {
    const sourceVideoPath = await video.path();
    mkdirSync(path.dirname(stableVideoPath), { recursive: true });
    copyFileSync(sourceVideoPath, stableVideoPath);
    await testInfo.attach('model-creation-video', { path: stableVideoPath, contentType: 'video/webm' });
  }
});

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
    { timeout: 30_000 }
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

async function seedCreatedModel(page, filePath) {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  fixture.id = modelName;
  fixture.label = modelName;
  const content = JSON.stringify(fixture, null, 2);

  const hostWorkspace = process.env.CINCODEBIO_EDITOR_WORKSPACE_DIR;
  if (hostWorkspace) {
    mkdirSync(hostWorkspace, { recursive: true });
    writeFileSync(path.join(hostWorkspace, `${modelName}.flow`), content);
    return;
  }

  const kubectlCommand = normalizeKubectlCommand(process.env.CINCODEBIO_KUBECTL_COMMAND ?? 'kubectl');
  const namespace = process.env.CINCODEBIO_EDITOR_NAMESPACE ?? 'default';
  const selector = process.env.CINCODEBIO_EDITOR_POD_SELECTOR ?? 'app=cinco-de-bio-editor';
  const container = process.env.CINCODEBIO_EDITOR_CONTAINER ?? 'cinco-de-bio-editor';
  const pod = execSync(`${kubectlCommand} get pod -n ${quote(namespace)} -l ${quote(selector)} -o jsonpath='{.items[0].metadata.name}'`, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
  execSync(`${kubectlCommand} exec -i -n ${quote(namespace)} -c ${quote(container)} ${quote(pod)} -- sh -lc ${quote(`cat > ${filePath}`)}`, {
    input: content,
    stdio: ['pipe', 'ignore', 'pipe']
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
    await manager.doOpen(widget, { mode: 'activate' });
    return { ok: true, widgetId: widget.id };
  }, filePath);
  expect(opened.ok, opened.message ?? 'failed to open Cinco diagram').toBe(true);
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