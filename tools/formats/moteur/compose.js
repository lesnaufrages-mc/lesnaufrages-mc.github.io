// Rend un format du kit en vidéo 1080x1920 (30 i/s), image par image.
//   node compose.js <format> <donnees.json> <sortie.mp4> [debut fin]   -> vidéo muette (ou un morceau)
//   node compose.js <format> <donnees.json> - 1.5 8 20                 -> aperçus PNG (dossier apercu/ à côté des données)
//   node compose.js <format> <donnees.json> events                     -> écrit <donnees>.events.json (durée + bruitages)
// <format> = nom d'un fichier de ../formats (classement, chronologie, versus…)
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
(async () => {
  const [,, format, dataFile, out, ...times] = process.argv; const FPS = 30;
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  pg.on('pageerror', (e) => console.log('ERREUR PAGE', e.message));
  await pg.addInitScript((d) => { window.DATA = d; }, data);
  await pg.goto('file://' + path.resolve(__dirname, '../formats', format + '.html'));
  await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(300);
  const dur = await pg.evaluate(() => window.DURATION);
  if (out === 'events') { const ev = await pg.evaluate(() => EVENTS()); fs.writeFileSync(dataFile.replace(/\.json$/, '') + '.events.json', JSON.stringify({ duree: dur, events: ev })); console.log('durée', dur); await b.close(); return; }
  if (out === '-') { const dir = path.join(path.dirname(dataFile), 'apercu'); fs.mkdirSync(dir, { recursive: true });
    for (const t of times) { await pg.evaluate((t) => render(t), +t); await pg.screenshot({ path: `${dir}/${format}_${t}.png` }); console.log('aperçu', t); } await b.close(); return; }
  const a = times.length ? +times[0] : 0, z = times.length ? +times[1] : dur;
  const n0 = Math.round(a * FPS), n1 = Math.round(z * FPS);
  const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = n0; i < n1; i++) { await pg.evaluate((t) => render(t), i / FPS); const buf = await pg.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise((r) => ff.on('close', r)); await b.close(); console.log('fini', n0, n1);
})();
