// Hidden check for the sales chart: one self-contained SVG, readable without colour.
// With a browser available it also saves a picture of the chart (SHOT_DIR) for the person.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const file = path.join(process.cwd(), 'chart.svg');
const svg = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const texts = [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(m => m[1].replace(/<[^>]+>/g, ' ')).join(' ');

test('chart.svg exists and is an SVG', () => {
  assert.ok(svg, 'no chart.svg');
  assert.match(svg, /<svg[\s>]/);
  assert.match(svg, /<\/svg>\s*$/);
});
test('self-contained: nothing loaded from the internet', () => {
  assert.ok(svg, 'no chart.svg');
  assert.doesNotMatch(svg.replace(/xmlns(:\w+)?="[^"]*"/g, ''), /(href|src)\s*=\s*"(https?:)?\/\//);
  assert.doesNotMatch(svg, /@import|url\(\s*['"]?https?:/);
  assert.ok(svg.length < 400000, `${svg.length} bytes`);
});
test('every region is named', () => {
  for (const r of ['North', 'South', 'East', 'West']) assert.match(texts, new RegExp(r), r);
});
test('the months are labelled', () => {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const found = M.filter(m => new RegExp(`\\b${m}`, 'i').test(texts)).length;
  const numeric = new Set([...texts.matchAll(/\b(?:2026-)?(0[1-9]|1[0-2])\b/g)].map(m => m[1])).size;
  assert.ok(Math.max(found, numeric) >= 6, `${found} month names, ${numeric} month numbers in the labels`);
});
test('regions told apart without colour: dashes, markers, patterns or direct labels', () => {
  assert.ok(svg, 'no chart.svg');
  const dashes = new Set([...svg.matchAll(/stroke-dasharray\s*[=:]\s*"?([\d.,\s]+)/g)].map(m => m[1].trim())).size;
  const markers = /<marker[\s>]|<pattern[\s>]/.test(svg);
  const shapes = new Set([...svg.matchAll(/<(circle|rect|polygon|path|polyline|line|ellipse)\b/g)].map(m => m[1])).size >= 3;
  assert.ok(dashes >= 3 || markers || shapes, `dash styles ${dashes}, markers/patterns ${markers}`);
});
test('the August dip in the East is pointed out', () => {
  assert.match(texts, /dip|drop|fell|fall|slump|halv|plunge|low|-\s?\d+\s?%|outage|anomal/i);
});
test('a picture for the person (when a browser is available)', { timeout: 60000 }, async t => {
  if (!svg || !process.env.SHOT_DIR) return t.skip('no chart or nowhere to save');
  let chromium; try { ({ chromium } = require('playwright-core')); } catch { return t.skip('no browser library'); }
  const b = await chromium.launch({ executablePath: process.env.CHECK_CHROMIUM || undefined }).catch(() => null);
  if (!b) return t.skip('no browser');
  const p = await b.newPage({ viewport: { width: 1000, height: 700 } });
  await p.goto('file://' + file);
  fs.mkdirSync(process.env.SHOT_DIR, { recursive: true });
  await p.screenshot({ path: path.join(process.env.SHOT_DIR, 'chart.png'), timeout: 15000 });
  await b.close();
});
