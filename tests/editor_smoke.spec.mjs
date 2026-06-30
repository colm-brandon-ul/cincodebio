import { test, expect } from '@playwright/test';

const editorUrl = process.env.CINCODEBIO_EDITOR_URL ?? 'http://localhost:3000';

test('CincoDeBio editor renders visible UI', async ({ page }, testInfo) => {
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
  await page.waitForTimeout(5_000);

  await testInfo.attach('diagnostics', {
    body: diagnostics.join('\n') || 'no diagnostics',
    contentType: 'text/plain'
  });
  await page.screenshot({ path: `artifacts/playwright/editor-smoke-${testInfo.project.name}.png`, fullPage: true });

  const bodyText = await page.locator('body').innerText().catch(() => '');
  const visibleText = bodyText.replace(/\s+/g, ' ').trim();
  expect(visibleText.length, diagnostics.join('\n')).toBeGreaterThan(0);

  const glspFailures = diagnostics.filter(line => line.includes('cinco-diagram'));
  expect(glspFailures, diagnostics.join('\n')).toHaveLength(0);
});