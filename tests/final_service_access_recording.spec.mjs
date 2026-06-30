import { test, expect } from '@playwright/test';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';

const hostResolverArgs = ['--host-resolver-rules=MAP cdb.local 127.0.0.1,MAP minio.cdb.local 127.0.0.1'];
const outputDirectory = 'test-results';

const pages = [
  {
    name: 'app',
    url: process.env.CINCODEBIO_APP_URL ?? 'http://cdb.local/app/',
    video: `${outputDirectory}/final-service-app.webm`,
    screenshot: `${outputDirectory}/final-service-app.png`,
    expected: /workflow|cincodebio|app/i
  },
  {
    name: 'minio-console',
    url: process.env.CINCODEBIO_MINIO_CONSOLE_URL ?? 'http://cdb.local/minio-console/',
    video: `${outputDirectory}/final-service-minio-console.webm`,
    screenshot: `${outputDirectory}/final-service-minio-console.png`,
    expected: /minio|login|console/i
  },
  {
    name: 'minio-api',
    url: process.env.CINCODEBIO_MINIO_API_URL ?? 'http://minio.cdb.local/',
    video: `${outputDirectory}/final-service-minio-api.webm`,
    screenshot: `${outputDirectory}/final-service-minio-api.png`,
    expected: /minio|accessdenied|anonymous/i
  }
];

test.use({ video: 'on', launchOptions: { args: hostResolverArgs } });

for (const service of pages) {
  test(`records ${service.name} access`, async ({ page }, testInfo) => {
    test.setTimeout(90_000);
    mkdirSync(outputDirectory, { recursive: true });
    const response = await page.goto(service.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined);
    expect(response?.status() ?? 0, `${service.url} returned no HTTP response`).toBeGreaterThanOrEqual(200);
    expect(response?.status() ?? 0, `${service.url} returned a server error`).toBeLessThan(500);
    await expect(page.locator('body'), `${service.url} should render a visible page`).toContainText(service.expected, { timeout: 30_000 });
    await page.screenshot({ path: service.screenshot, fullPage: true });
    await page.waitForTimeout(2_000);

    const video = page.video();
    await page.close().catch(() => undefined);
    if (video) {
      await video.saveAs(service.video).catch(async () => {
        const sourceVideoPath = await video.path();
        if (existsSync(sourceVideoPath)) {
          copyFileSync(sourceVideoPath, service.video);
        }
      });
      if (existsSync(service.video)) {
        await testInfo.attach(`${service.name}-video`, { path: service.video, contentType: 'video/webm' });
      }
    }
  });
}