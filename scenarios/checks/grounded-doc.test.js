// Hidden check for a written document: is it grounded in the code it talks about?
// DOC (file name), MAX_WORDS and SECTIONS come from the environment the runner sets.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const DOC = process.env.DOC || 'DOC.md';
const MAX = Number(process.env.MAX_WORDS || 800);
const SECTIONS = (process.env.SECTIONS || '').split('|').filter(Boolean);
const file = path.join(process.cwd(), DOC);
const doc = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

// Every file in the folder, and every name defined in its code.
const files = [], names = new Set();
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (['.git', 'node_modules', '.hidden-check'].includes(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else {
      files.push(path.relative(process.cwd(), p).split(path.sep).join('/'));
      if (/\.(js|mjs|cjs|ts)$/.test(e.name)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?:function\s+|(?:const|let|var)\s+|^\s*(?:async\s+)?)([A-Za-z_$][\w$]*)\s*(?:=\s*(?:async\s*)?(?:\(|function|\w+\s*=>)|\()/gm)) names.add(m[1]);
    }
  }
})(process.cwd());
const ticks = [...doc.matchAll(/`([^`\n]{1,80})`/g)].map(m => m[1].trim());
const paths = ticks.filter(t => /^[\w./-]+\.(js|json|md|html|css|csv|txt|log)$/.test(t) || /^[\w-]+\/[\w./-]+$/.test(t));
const fns = ticks.map(t => (/^([A-Za-z_$][\w$.]*)\(\)?/.exec(t) || [])[1]).filter(Boolean).map(f => f.split('.').pop());
// A path counts if it names a file or folder here, also when written from a parent folder (app/engine.js for engine.js).
const pathOk = p => { const q = p.replace(/^\.\//, '').replace(/\/$/, ''); return files.some(f => f === q || f.endsWith('/' + q) || q.endsWith('/' + f) || f.startsWith(q + '/') || q.split('/').slice(1).some((_, k, a) => f.startsWith(a.slice(k).join('/') + '/'))); };

test(`${DOC} exists`, () => { assert.ok(doc, `no ${DOC}`); });
test(`at most ${MAX} words`, () => { const n = (doc.match(/\S+/g) || []).length; assert.ok(n > 0 && n <= MAX, `${n} words`); });
for (const s of SECTIONS) test(`has a section on "${s}"`, () => assert.match(doc, new RegExp(`^#+ .*${s}`, 'im')));
test('points to the code: at least 5 files or functions named in backticks', () => { assert.ok(paths.length + fns.length >= 5, `${paths.length} files, ${fns.length} functions`); });
test('every file it names exists', () => { assert.ok(doc && paths.length, 'no files named'); const bad = paths.filter(p => !pathOk(p)); assert.deepStrictEqual(bad, []); });
test('every function it names exists', () => { assert.ok(doc && fns.length, 'no functions named'); const bad = [...new Set(fns)].filter(f => !names.has(f)); assert.deepStrictEqual(bad, []); });
