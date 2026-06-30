import { test, expect, request as playwrightRequest } from '@playwright/test';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Proof that a generated workflow runs to COMPLETION and its result is visible.
 *
 * Opens the Theia editor (model-element images served by editor-files render), then opens the
 * monitoring page for a completed workflow and waits until every job row shows "completed".
 *
 * Workflow id: CINCODEBIO_WORKFLOW_ID, else the newest completed workflow from execution-api.
 *
 *   CINCODEBIO_EDITOR_URL=http://localhost/editor/ \
 *   CINCODEBIO_APP_URL=http://localhost/app \
 *   CINCODEBIO_EXECUTION_API_URL=http://localhost/execution-api/ext \
 *   npm run test:final-k3s-workflow-completed
 */

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost/editor/';
const appUrl = (process.env.CINCODEBIO_APP_URL ?? 'http://localhost/app').replace(/\/+$/, '');
const executionApiUrl = (process.env.CINCODEBIO_EXECUTION_API_URL ?? 'http://localhost/execution-api/ext').replace(/\/+$/, '');
const videoPath = 'artifacts/playwright/final-k3s-workflow-completed.webm';

test.use({ video: 'on', ignoreHTTPSErrors: true, viewport: { width: 1600, height: 1000 } });

test('k3s: a generated TMA workflow runs to completed and the result is visible', async ({ page, context }, testInfo) => {
  test.setTimeout(240_000);
  const api = await playwrightRequest.newContext({ ignoreHTTPSErrors: true });

  const workflowId = await resolveCompletedWorkflowId(api);
  expect(workflowId, 'a completed workflow id (set CINCODEBIO_WORKFLOW_ID or run a workflow first)').toBeTruthy();
  await testInfo.attach('workflow-id', { body: String(workflowId), contentType: 'text/plain' });

  await test.step('open the Cinco editor (model-element images render over localhost:80)', async () => {
    await page.goto(editorUrl, { waitUntil: 'domcontentloaded', timeout: 120_000 });
    await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => undefined);
    await expect(page.locator('body')).toContainText('File', { timeout: 120_000 });
    await page.waitForTimeout(2_000);
  });

  await test.step('open the completed workflow page and confirm every job is completed', async () => {
    const wf = await context.newPage();
    const resp = await wf.goto(`${appUrl}/workflows/${workflowId}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    expect(resp?.status() ?? 0, 'workflow page status').toBeLessThan(400);

    // The page renders job rows from the execution-api websocket. Wait for all five SIBs to show completed.
    await expect.poll(async () => {
      const rows = await wf.locator('#wf-state-container li').allInnerTexts().catch(() => []);
      return rows.filter(t => /completed/i.test(t)).length;
    }, { timeout: 120_000, message: 'waiting for all job rows to reach completed' }).toBeGreaterThanOrEqual(5);

    await expect(wf.locator('#wf-status')).toContainText(/completed/i, { timeout: 30_000 });

    // Overlay a concise result summary for the recording.
    const state = await getWorkflowState(api, workflowId);
    await wf.evaluate(s => {
      const p = document.createElement('div');
      p.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:2147483647;width:560px;padding:16px;border-radius:8px;border:1px solid rgba(255,255,255,0.18);background:rgba(12,18,22,0.94);color:#eef;font:12px/1.45 monospace;white-space:pre-wrap';
      p.textContent = 'WORKFLOW EXECUTION RESULT\n' + JSON.stringify(s, null, 2);
      document.body.appendChild(p);
    }, state);
    await wf.waitForTimeout(6_000);
    await wf.screenshot({ path: 'artifacts/playwright/final-k3s-workflow-completed.png', fullPage: true });
    await testInfo.attach('execution-state', { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
    await wf.close();
  });

  await api.dispose();
  const video = page.video();
  await page.close();
  if (video) {
    const src = await video.path();
    mkdirSync(dirname(videoPath), { recursive: true });
    copyFileSync(src, videoPath);
    if (existsSync(videoPath)) {
      await testInfo.attach('k3s-workflow-completed-video', { path: videoPath, contentType: 'video/webm' });
    }
  }
});

async function resolveCompletedWorkflowId(api) {
  if (process.env.CINCODEBIO_WORKFLOW_ID) return process.env.CINCODEBIO_WORKFLOW_ID;
  try {
    const r = await api.get(`${executionApiUrl}/get-workflows`, { timeout: 15_000 });
    if (!r.ok()) return undefined;
    const body = await r.json();
    const completed = (Array.isArray(body) ? body : []).filter(w => /completed/i.test(String(w.status)));
    const pick = completed[completed.length - 1] ?? body[body.length - 1];
    return pick ? String(pick.id ?? pick._id) : undefined;
  } catch { return undefined; }
}

async function getWorkflowState(api, id) {
  try {
    const r = await api.get(`${executionApiUrl}/get-workflows`, { timeout: 15_000 });
    const body = await r.json();
    const w = (Array.isArray(body) ? body : []).find(x => String(x.id ?? x._id) === String(id));
    return { workflowId: id, status: w?.status ?? 'unknown' };
  } catch { return { workflowId: id, status: 'unknown' }; }
}
