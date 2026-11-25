// Hidden check for the animation: one self-contained page that moves, and runs without errors.
// With a browser available it saves three frames (SHOT_DIR) for the person.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'index.html');
const html = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

test('index.html exists', () => { assert.ok(html, 'no index.html'); });
test('self-contained: no scripts, styles, fonts or images from the internet', () => {
  assert.ok(html, 'no index.html');
  assert.doesNotMatch(html, /(src|href)\s*=\s*["']?(https?:)?\/\//i);
  assert.doesNotMatch(html, /@import|url\(\s*['"]?https?:/i);
  assert.ok(html.length < 600000, `${html.length} bytes`);
});
test('it moves: CSS animation, SVG animation or a frame loop', () => {
  assert.match(html, /@keyframes|requestAnimationFrame|<animate|setInterval|\.animate\(/);
});
test('it talks about the vote', () => { assert.match(html, /vot/i); });
test('it runs without errors, and the picture changes over time', { timeout: 60000 }, async t => {
  assert.ok(html, 'no index.html');
  let chromium; try { ({ chromium } = require('playwright-core')); } catch { return t.skip('no browser library'); }
  const b = await chromium.launch({ executablePath: process.env.CHECK_CHROMIUM || undefined }).catch(() => null);
  if (!b) return t.skip('no browser');
  const p = await b.newPage({ viewport: { width: 960, height: 600 } });
  const errors = [];
  p.on('pageerror', e => errors.push(String(e.message || e)));
  await p.goto('file://' + file);
  const shots = [];
  for (const ms of [500, 4000, 9000]) {
    await p.waitForTimeout(ms - (shots.length ? [500, 4000, 9000][shots.length - 1] : 0));
    shots.push(await p.screenshot({ timeout: 15000 }));
  }
  if (process.env.SHOT_DIR) { fs.mkdirSync(process.env.SHOT_DIR, { recursive: true }); shots.forEach((s, k) => fs.writeFileSync(path.join(process.env.SHOT_DIR, `frame-${k + 1}.png`), s)); }
  await b.close();
  assert.deepStrictEqual(errors, []);
  assert.ok(!shots[0].equals(shots[1]) || !shots[1].equals(shots[2]), 'the three frames are the same');
});
