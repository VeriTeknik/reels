// Usage: node render.mjs <durationSec> <out.mp4> [audio.mp3]
// Renders reel.html frame by frame (deterministic window.render(t)) and encodes 1080x1920 H.264.
import { chromium } from 'playwright';
import { execFileSync, spawn } from 'node:child_process';
import path from 'node:path';

const [,, durArg, out, audio] = process.argv;
const DUR = Number(durArg);
const FPS = 30;
const voDur = DUR - 1.0;

// Spoken sentences (captions show the readable spelling; timing is weighted by spoken length).
const S = [
  ["Test sunucumuza son on dört dakikada kim girmeye çalıştı?", "Test sunucumuza son 14 dakikada kim girmeye çalıştı?"],
  ["Asistana tek cümleyle sorduk.", "Asistana tek cümleyle sorduk."],
  ["VeriTeknik Emsipi, sunucunun güvenlik kaydını okudu.", "VeriTeknik MCP, sunucunun güvenlik kaydını okudu."],
  ["Kırk dokuz hatalı parola, yetmiş beş uydurma kullanıcı adı, dokuz farklı adres.", "49 hatalı parola, 75 uydurma kullanıcı adı, 9 farklı adres."],
  ["Başarılı tek giriş bizimdi: bu kaydı okuyan anahtar.", "Başarılı tek giriş bizimdi: bu kaydı okuyan anahtar."],
  ["Öneri de hazır: parola girişini kapat, fail-tu-ben kur.", "Öneri de hazır: parola girişini kapat, fail2ban kur."],
  ["VeriTeknik Emsipi artık Klod dizininde ve GitHub Emsipi Rejistri'de.", "VeriTeknik MCP artık Claude dizininde ve GitHub MCP Registry'de."],
];
const total = S.reduce((a, s) => a + s[0].length, 0);
let acc = 0;
let CUES = S.map(([spoken, shown]) => { const a = acc / total * voDur; acc += spoken.length; return [a, acc / total * voDur, shown]; });
if (process.env.CUE_TIMES) { const ts = JSON.parse(process.env.CUE_TIMES); CUES = CUES.map((c, i) => [ts[i][0], ts[i][1], c[2]]); }
const st = i => CUES[i][0];
const TIMING = { typeStart: .3, typeEnd: Math.max(1.5, st(1) - .2), tool: st(2), result: st(3) - .3, ans: st(5), cta: st(6) };
console.log(JSON.stringify({ TIMING, CUES: CUES.map(c => [c[0].toFixed(2), c[1].toFixed(2)]) }));

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }).catch(() => chromium.launch());
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.addInitScript(([c, t]) => { window.CUES = c; window.TIMING = t; }, [CUES, TIMING]);
await page.goto('file://' + path.resolve('reel.html'));
await page.evaluate(() => document.fonts.ready);

const args = ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-'];
if (audio) args.push('-i', audio);
args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-r', String(FPS));
if (audio) args.push('-af', 'apad', '-c:a', 'aac', '-b:a', '160k', '-t', String(DUR));
args.push('-movflags', '+faststart', out);
const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });

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
