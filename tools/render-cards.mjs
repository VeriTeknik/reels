// Usage: node render-cards.mjs <data.json> <voice.mp3> <out.mp4>
// Times each sentence from the pauses in the voiceover, then renders cards.html frame by frame.
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const [,, dataPath, audio, out] = process.argv;
const D = JSON.parse(readFileSync(dataPath, 'utf8'));
const FPS = 30;
const audioDur = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', audio]).toString());
const DUR = Math.round((audioDur + 1.4) * 10) / 10;

// Pauses in the voice (midpoints), then snap each proportional sentence boundary to the nearest unused pause after the previous one.
const log = (() => { try { return execFileSync('sh', ['-c', `ffmpeg -i "${audio}" -af silencedetect=noise=-35dB:d=0.2 -f null - 2>&1`]).toString(); } catch (e) { return e.stdout?.toString() ?? ''; } })();
const starts = [...log.matchAll(/silence_start: ([\d.]+)/g)].map(m => +m[1]);
const ends = [...log.matchAll(/silence_end: ([\d.]+)/g)].map(m => +m[1]);
const pauses = starts.map((s, i) => [s, ends[i] ?? audioDur]).filter(([s]) => s > 0.3 && s < audioDur - 0.3);
const S = D.sentences;
const total = S.reduce((a, s) => a + s.spoken.length, 0);
let acc = 0; const est = S.slice(0, -1).map(s => (acc += s.spoken.length) / total * audioDur);
const bounds = []; let lastIdx = -1;
for (const e of est) {
  let best = -1, bd = Infinity;
  pauses.forEach(([s, en], i) => { if (i <= lastIdx) return; const d = Math.abs((s + en) / 2 - e); if (d < bd) { bd = d; best = i; } });
  if (best >= 0 && bd < 2.5) { bounds.push(pauses[best]); lastIdx = best; } else bounds.push([e, e]);
}
const cues = S.map((s, i) => [i === 0 ? 0.05 : bounds[i - 1][1] - 0.05, i === S.length - 1 ? DUR : bounds[i][0] + 0.1, s.caption]);
console.log(JSON.stringify({ DUR, cues: cues.map(c => [c[0].toFixed(2), c[1].toFixed(2), c[2].slice(0, 30)]) }));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.addInitScript(d => { window.DATA = d; }, { ...D, cues });
await page.goto('file://' + path.resolve(path.dirname(new URL(import.meta.url).pathname), 'cards.html'));
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
console.log('done', out, execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]).toString().trim());
