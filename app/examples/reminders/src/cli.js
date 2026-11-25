const fs = require('fs');
const { runs } = require('./schedule');
const { localParts } = require('./tz');

const [file, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : d; };
const from = new Date(opt('--from', new Date().toISOString()));
const count = Number(opt('--count', 3));
const pad = n => String(n).padStart(2, '0');
for (const rule of JSON.parse(fs.readFileSync(file, 'utf8'))) {
  console.log(rule.name);
  for (const t of runs(rule, from, count)) {
    const p = localParts(t, rule.tz);
    console.log(`  ${t.toISOString()}  (${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)} ${rule.tz})`);
  }
}
