/**
 * Records a real, end-to-end run of ConsistentAI as a video.
 *
 * It drives the live app in a visible browser exactly as a user would:
 * sign in -> create a project -> add a character from a photo -> have the AI
 * draft the story -> save scenes -> generate every frame -> open a frame ->
 * present mode -> gallery. Nothing is mocked, so it uses real credits
 * (one per scene) and real model output. Typically 2-5 minutes of video.
 *
 * Required env:
 *   DEMO_EMAIL, DEMO_PASSWORD   an account on the target app
 *   DEMO_PHOTO                  path to a clear face photo (jpg/png)
 * Optional env:
 *   BASE_URL      default https://consistentai.onrender.com
 *   DEMO_SCENES   scenes to generate, default 4 (each costs one credit)
 *   DEMO_PREMISE  story idea for the AI writer
 *   OUT           output file, default ../../demo-output/consistentai-demo.webm
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || 'https://consistentai.onrender.com').replace(/\/$/, '');
const EMAIL = process.env.DEMO_EMAIL;
const PASSWORD = process.env.DEMO_PASSWORD;
const PHOTO = process.env.DEMO_PHOTO && path.resolve(process.env.DEMO_PHOTO);
const SCENES = Math.min(8, Math.max(2, Number(process.env.DEMO_SCENES) || 4));
const PREMISE = process.env.DEMO_PREMISE || 'A cartographer finds a door in a lighthouse wall that is not on any map';
const OUT = path.resolve(process.env.OUT || path.join(here, '../../demo-output/consistentai-demo.webm'));
const MIN_SECONDS = 45;

for (const [name, value] of [['DEMO_EMAIL', EMAIL], ['DEMO_PASSWORD', PASSWORD], ['DEMO_PHOTO', PHOTO]]) {
  if (!value) { console.error(`Missing ${name}. See the header of this file.`); process.exit(1); }
}
if (!fs.existsSync(PHOTO)) { console.error(`DEMO_PHOTO not found: ${PHOTO}`); process.exit(1); }

const tmpDir = fs.mkdtempSync(path.join(here, '.video-'));
fs.mkdirSync(path.dirname(OUT), { recursive: true });

const browser = await chromium.launch({ headless: false, args: ['--window-size=1320,820'] });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: tmpDir, size: { width: 1280, height: 720 } },
});

// A visible cursor, since Playwright's recordings don't draw one.
await context.addInitScript(() => {
  window.addEventListener('DOMContentLoaded', () => {
    const dot = document.createElement('div');
    dot.style.cssText = 'position:fixed;z-index:2147483647;width:20px;height:20px;border-radius:50%;background:rgba(255,90,44,.55);border:2px solid #fff;pointer-events:none;transform:translate(-50%,-50%);left:-60px;top:-60px;transition:left .06s linear,top .06s linear';
    document.documentElement.appendChild(dot);
    document.addEventListener('mousemove', (e) => { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }, true);
  });
});

const page = await context.newPage();
const t0 = Date.now();
const log = (msg) => console.log(`[${String(Math.round((Date.now() - t0) / 1000)).padStart(3)}s] ${msg}`);
const pause = (ms) => page.waitForTimeout(ms);

async function click(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 });
  await pause(250);
  await locator.click();
}
async function type(locator, text) {
  await click(locator);
  await locator.pressSequentially(text, { delay: 35 });
}

let failed = false;
try {
  log('Home');
  await page.goto(BASE_URL, { waitUntil: 'networkidle' });
  await pause(2500);
  await page.mouse.wheel(0, 700); await pause(1800);
  await page.mouse.wheel(0, 700); await pause(1800);
  await page.mouse.wheel(0, -1400); await pause(1200);

  log('Sign in');
  await click(page.getByRole('link', { name: 'Sign in', exact: true }).first());
  await page.waitForURL('**/auth');
  await type(page.locator('input[type=email]'), EMAIL);
  await type(page.locator('input[type=password]'), PASSWORD);
  await click(page.locator('form button[type=submit]'));
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await pause(2000);

  log('New project');
  const stamp = new Date().toISOString().slice(5, 16).replace('T', ' ');
  await click(page.getByRole('button', { name: /New project|Start the first project/ }).first());
  await type(page.locator('#project-name'), `Lighthouse Map ${stamp}`);
  await type(page.locator('#project-description'), 'Two keepers find a door that is not on the chart.');
  await click(page.getByRole('button', { name: 'Create Project' }));
  await page.waitForURL('**/editor/**', { timeout: 30000 });
  await pause(2000);

  log('Add character from photo (extracts Visual DNA)');
  await click(page.getByRole('button', { name: 'Add', exact: true }));
  await type(page.getByPlaceholder('Character name'), 'Mara');
  await type(page.getByPlaceholder(/Describe appearance/), 'Cartographer in a rust-red field jacket');
  await page.setInputFiles('input[type=file]', PHOTO);
  await pause(1500);
  await click(page.getByRole('button', { name: 'Add Character' }));
  await page.getByText(/Character added/).waitFor({ timeout: 90000 });
  await pause(2500);

  log('Write the story with AI');
  await click(page.getByRole('button', { name: 'Write with AI' }));
  await type(page.getByPlaceholder(/knight discovers/), PREMISE);
  await page.locator('input[type=number]').fill(String(SCENES));
  await pause(600);
  await click(page.getByRole('button', { name: 'Generate', exact: true }));
  await page.getByText(/scenes drafted/).waitFor({ timeout: 90000 });
  await pause(3500);

  log('Save scenes');
  await click(page.getByRole('button', { name: 'Save scenes' }));
  await page.getByText(/scenes? saved/).first().waitFor({ timeout: 30000 });
  await pause(2000);

  log(`Generate ${SCENES} frames (models race, judge scores)`);
  await click(page.getByRole('button', { name: /Generate all/ }));
  const deadline = Date.now() + 8 * 60 * 1000;
  for (;;) {
    const waiting = await page.locator('span', { hasText: /^(pending|shooting)$/ }).count();
    if (waiting === 0) break;
    if (Date.now() > deadline) throw new Error('Timed out waiting for generation to finish');
    await pause(2000);
  }
  log('Generation finished');
  await pause(3000);

  log('Open a frame');
  const firstFrame = page.locator('img[alt^="Scene 1"]').first();
  if (await firstFrame.count()) {
    await click(firstFrame);
    await page.getByRole('dialog').waitFor();
    await pause(4500);
    await page.keyboard.press('Escape');
    await pause(1000);

    log('Presentation mode');
    await click(page.getByRole('button', { name: 'Present' }));
    await pause(3000);
    for (let i = 0; i < SCENES - 1; i++) { await page.keyboard.press('ArrowRight'); await pause(2800); }
    await page.keyboard.press('Escape');
    await pause(1000);
  } else {
    log('No finished frame to open (every generation failed); skipping viewer steps');
  }

  log('Gallery');
  await click(page.getByRole('link', { name: 'Gallery', exact: true }).first());
  await page.waitForURL('**/gallery');
  await pause(4000);
  await page.mouse.wheel(0, 500);
  await pause(2500);
} catch (err) {
  failed = true;
  console.error('\nDemo step failed:', err.message);
  await page.screenshot({ path: path.join(path.dirname(OUT), 'failure.png') }).catch(() => {});
  console.error('Saved failure.png next to the video output.');
}

while (Date.now() - t0 < MIN_SECONDS * 1000) await pause(500);

const video = page.video();
await context.close();
await browser.close();
await video.saveAs(OUT);
fs.rmSync(tmpDir, { recursive: true, force: true });
console.log(`\n${failed ? 'Partial recording' : 'Recording'} saved: ${OUT}`);
console.log(`Length: about ${Math.round((Date.now() - t0) / 1000)} seconds`);
process.exit(failed ? 1 : 0);
