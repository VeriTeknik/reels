// Usage: node render-guve.mjs <data.json> <voice.mp3> <env.json> <out.mp4>
// Renders guve.html (Güve narrator template) frame by frame; mouth follows the voice envelope.
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [,, dataPath, audio, envPath, out] = process.argv;
const D = JSON.parse(readFileSync(dataPath, 'utf8'));
D.env = JSON.parse(readFileSync(envPath, 'utf8'));
const FPS = 30;
const audioDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).toString());
const DUR = Math.round((audioDur + 1.5) * 10) / 10;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.addInitScript(d => { window.DATA = d; }, D);
await page.goto('file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), 'guve.html'));
await page.evaluate(() => document.fonts.ready);

const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-i', audio,
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-r', String(FPS),
  '-af', 'apad', '-c:a', 'aac', '-b:a', '160k', '-t', String(DUR), '-movflags', '+faststart', out], { stdio: ['pipe', 'ignore', 'ignore'] });
const N = Math.round(DUR * FPS);
for (let i = 0; i < N; i++) {
  await page.evaluate(t => window.render(t), i / FPS);
  const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
  if (!ff.stdin.write(buf)) await new Promise(r => { ff.stdin.once('drain', r); ff.once('close', r); });
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('done', out, DUR);
