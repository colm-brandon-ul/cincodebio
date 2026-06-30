import { test, expect, request as playwrightRequest } from '@playwright/test';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Proof that a workflow result is shown IN the editor's simple-browser (Theia MiniBrowser),
 * recorded with video. The generator opens the workflow URL via
 * `executeCommand('mini-browser.openUrl', url)` — this test opens the same way for a workflow
 * that has run to COMPLETED, so the in-editor browser renders the finished result.
 *
 *   CINCODEBIO_EDITOR_URL=http://localhost/editor/#/editor/workspace
 *   CINCODEBIO_APP_URL=http://localhost/app
 *   CINCODEBIO_EXECUTION_API_URL=http://localhost/execution-api/ext
 *   CINCODEBIO_WORKFLOW_ID=<completed id>   (else newest completed)
 *   CINCODEBIO_RUNTIME_LABEL=k3s|minikube
 */
const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/#/editor/workspace';
const appUrl = (process.env.CINCODEBIO_APP_URL ?? 'http://localhost/app').replace(/\/+$/, '');
const execApi = (process.env.CINCODEBIO_EXECUTION_API_URL ?? 'http://localhost/execution-api/ext').replace(/\/+$/, '');
const runtimeLabel = process.env.CINCODEBIO_RUNTIME_LABEL ?? 'k3s';
const slug = runtimeLabel.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
const videoPath = `artifacts/playwright/final-${slug}-result-in-simple-browser.webm`;
const shotPath = `artifacts/playwright/final-${slug}-result-in-simple-browser.png`;

test.use({ video: 'on', ignoreHTTPSErrors: true, viewport: { width: 1680, height: 1040 } });

test(`${runtimeLabel}: completed workflow result is shown in the editor's simple-browser`, async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const workflowId = await resolveCompleted(api);
  expect(workflowId, 'a completed workflow id').toBeTruthy();
  const workflowUrl = `${appUrl}/workflows/${workflowId}`;
  testInfo.attach('workflow', { body: `${workflowId} (${await statusOf(api, workflowId)})\n${workflowUrl}`, contentType: 'text/plain' });

  await test.step('open the Cinco editor', async () => {
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
    await page.waitForTimeout(6_000);
  });

  await test.step('open the completed workflow URL in the in-editor simple-browser', async () => {
    const r = await page.evaluate(async url => {
      const c = window.theia?.container;
      const reg = Array.from(c?._bindingDictionary?._map?.entries?.() ?? [])
        .map(([id]) => { try { return c.get(id); } catch { return undefined; } })
        .find(s => s && typeof s.executeCommand === 'function' && Array.isArray(s.commands));
      if (!reg) return { ok: false, reason: 'no command registry' };
      const id = reg.commands.some(c => c.id === 'mini-browser.openUrl') ? 'mini-browser.openUrl'
        : (reg.commands.some(c => c.id === 'simpleBrowser.api.open') ? 'simpleBrowser.api.open' : null);
      if (!id) return { ok: false, reason: 'no browser command' };
      await reg.executeCommand(id, url);
      return { ok: true, id };
    }, workflowUrl);
    expect(r.ok, r.reason ?? 'open in simple-browser').toBe(true);
    testInfo.attach('opened-via', { body: r.id, contentType: 'text/plain' });

    await expect.poll(() => page.evaluate(() =>
      document.querySelector('.theia-mini-browser, [class*="mini-browser"]') !== null), { timeout: 60_000 }).toBe(true);
  });

  await test.step('the simple-browser shows the completed workflow + job results', async () => {
    // The MiniBrowser hosts the workflow page in a same-origin iframe; wait until its job rows
    // render and report completed.
    const completedRows = async () => {
      for (const f of page.frames()) {
        try {
          const rows = await f.locator('#wf-state-container li').allInnerTexts();
          const done = rows.filter(t => /completed/i.test(t)).length;
          if (done > 0) return done;
        } catch { /* cross-origin or not ready */ }
      }
      return 0;
    };
    await expect.poll(completedRows,
      { timeout: 120_000, message: 'waiting for completed job rows to render inside the simple-browser' })
      .toBeGreaterThanOrEqual(5);

    await page.waitForTimeout(4_000);
    await page.screenshot({ path: shotPath, fullPage: true });
  });

  await api.dispose();
  const video = page.video();
  await page.close();
  if (video) {
    const src = await video.path();
    mkdirSync(dirname(videoPath), { recursive: true });
    copyFileSync(src, videoPath);
    if (existsSync(videoPath)) await testInfo.attach('result-in-simple-browser', { path: videoPath, contentType: 'video/webm' });
  }
});

async function resolveCompleted(api) {
  if (process.env.CINCODEBIO_WORKFLOW_ID) return process.env.CINCODEBIO_WORKFLOW_ID;
  try {
    const b = await (await api.get(`${execApi}/get-workflows`, { timeout: 15_000 })).json();
    const done = (Array.isArray(b) ? b : []).filter(w => /completed/i.test(String(w.status)));
    const pick = done[done.length - 1] ?? (Array.isArray(b) ? b[b.length - 1] : undefined);
    return pick ? String(pick.id ?? pick._id) : undefined;
  } catch { return undefined; }
}
async function statusOf(api, id) {
  try {
    const b = await (await api.get(`${execApi}/get-workflows`, { timeout: 15_000 })).json();
    return (Array.isArray(b) ? b : []).find(w => String(w.id ?? w._id) === String(id))?.status ?? '?';
  } catch { return '?'; }
}
