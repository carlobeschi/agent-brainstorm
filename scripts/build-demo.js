#!/usr/bin/env node
// Builds the online demo: a static copy of the app's page that replays saved runs.
//
//   node scripts/build-demo.js demo/demo.json docs/demo
//
// demo.json names the run folders to include and the slides shown before each one.
// Home folder paths are taken out of everything copied; the script then lists any line
// that still looks personal (a name, an email address, a key), for a person to check
// before publishing. Only state.json, the patches and the small text files each build
// changed are copied, plus the images the slides name.
const fs = require('fs');
const path = require('path');

const [cfgFile, outDir] = process.argv.slice(2);
if (!cfgFile || !outDir) { console.error('usage: node scripts/build-demo.js demo/demo.json <out folder>'); process.exit(2); }
const ROOT = path.join(__dirname, '..');
const cfg = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
const base = path.dirname(path.resolve(cfgFile));
const MAX_FILE = 150 * 1024;
const LOOKS_PERSONAL = [/\/Users\/|\/home\/(?!runner)/, /[\w.+-]+@(?!example\.|users\.noreply\.)[\w-]+\.[\w.]+/, /sk-[A-Za-z0-9]{10,}|AIza[0-9A-Za-z_-]{20,}/, ...(cfg.watch || []).map(w => new RegExp(w, 'i'))];

// Home folders out, everywhere.
const clean = s => String(s).replace(/\/Users\/[^/\s"'`]+/g, '~').replace(/\/home\/[^/\s"'`]+/g, '~').replace(/C:\\Users\\[^\\\s"'`]+/g, '~');
const deep = v => typeof v === 'string' ? clean(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v;

fs.mkdirSync(path.join(outDir, 'img'), { recursive: true });
const runs = cfg.runs.map((r, k) => {
  const dir = path.resolve(base, r.dir);
  const raw = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
  // The run's own folder, wherever it was, is shown as the app's usual place.
  const home = `~/.agent-brainstorm/runs/${raw.id}`;
  const olds = [...new Set([raw.dir, dir].filter(Boolean))];
  const moved = s => olds.reduce((t, o) => t.split(o).join(home), String(s));
  const S = deep(JSON.parse(moved(JSON.stringify(raw))));
  S.dir = home;
  for (const [a, b] of Object.entries(S.builds || {})) if (b && b.folder) b.folder = `${home}/build/${a}`;
  for (const st of Object.values(S.steps || {})) if (st.live) st.live = { out: '', err: st.live.err ? clean(st.live.err).slice(-1500) : '' };
  const files = {};
  const add = (key, file) => { if (fs.existsSync(file) && fs.statSync(file).size <= MAX_FILE) { const t = fs.readFileSync(file, 'utf8'); if (!t.includes('\0')) files[key] = clean(t); } };
  for (const a of S.agents) {
    add(`patches/${a.id}.patch`, path.join(dir, 'patches', `${a.id}.patch`));
    for (const f of ((S.builds || {})[a.id] || { files: [] }).files) add(`build/${a.id}/${f.path}`, path.join(dir, 'build', a.id, f.path));
  }
  const slides = r.slides.map(s => {
    if (!s.image) return s;
    const name = `run${k + 1}-${path.basename(s.image)}`;
    fs.copyFileSync(path.resolve(base, s.image), path.join(outDir, 'img', name));
    return { ...s, image: `img/${name}` };
  });
  return { title: r.title, subtitle: r.subtitle, slides, state: S, files };
});

const data = { title: cfg.title, intro: cfg.intro, repo: cfg.repo, runs };
fs.writeFileSync(path.join(outDir, 'runs.js'), `// Saved runs replayed by the demo (built by scripts/build-demo.js).\nwindow.DEMO = ${JSON.stringify(data)};\n`);
fs.copyFileSync(path.join(ROOT, 'app', 'page.js'), path.join(outDir, 'page.js'));
fs.copyFileSync(path.join(ROOT, 'demo', 'demo.js'), path.join(outDir, 'demo.js'));
const css = fs.readFileSync(path.join(ROOT, 'demo', 'demo.css'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'app', 'index.html'), 'utf8')
  .replace('<title>Brainstorm</title>', `<title>${cfg.page_title || 'Brainstorm demo'}</title>`)
  .replace('</style>', css + '\n</style>')
  .replace('<script src="/page.js"></script>', '<script src="runs.js"></script>\n<script src="demo.js"></script>\n<script src="page.js"></script>');
fs.writeFileSync(path.join(outDir, 'index.html'), html);

// What a person should look at before publishing.
const flagged = [];
for (const f of fs.readdirSync(outDir).filter(f => /\.(js|html)$/.test(f))) {
  fs.readFileSync(path.join(outDir, f), 'utf8').split(/\\n|\n/).forEach(line => { for (const re of LOOKS_PERSONAL) { const m = re.exec(line); if (m) flagged.push(`${f}: …${line.slice(Math.max(0, m.index - 40), m.index + 60)}…`); } });
}
console.log(`Demo written to ${outDir}: ${runs.length} runs, ${Math.round(fs.statSync(path.join(outDir, 'runs.js')).size / 1024)} KB of run data.`);
console.log(flagged.length ? `Check these ${flagged.length} lines before publishing:\n${[...new Set(flagged)].slice(0, 80).join('\n')}` : 'Nothing that looks personal was found.');
