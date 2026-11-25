// @ts-check
// Small helpers the brainstorm engine needs: starting agents safely, reading
// their replies, and shuffling ballots. Taken from agents-wrapper, where this
// app began (https://github.com/carlobeschi/agents-wrapper).

const crypto = require('crypto');

// ---- Starting an agent ----

// Flags that would loosen what an agent may do. A command with any of them is refused.
const LOOSE = /dangerously|bypass|yolo|auto-approve|full-access|danger-full|--allowedTools|--allowed-tools|^bash$|run_command/i;
function refuseLoose(cmd, where) {
  for (const s of cmd) if (LOOSE.test(String(s))) throw new Error(`${where}: "${s}" would loosen the agent's permissions; refused.`);
  if (cmd.includes('--enabled-tools') && cmd.some((s, i) => cmd[i - 1] === '--enabled-tools' && /bash|shell/i.test(s))) throw new Error(`${where}: no shell tool for Vibe.`);
}

// {model} first, so a prompt that happens to contain "{model}" is left as it is.
const fill = (args, prompt, model = '') => args.map(s => s.split('{model}').join(model).split('{prompt}').join(prompt));

// What an agent is given of this process's environment: enough to run and reach
// the network, plus the names its "env" lists (an API key, say). Not the rest:
// tokens and keys in the shell that started the app stay out of reach of an
// agent that could be talked into printing them.
const BASE_ENV = [
  'PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TERM', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TMPDIR', 'TZ',
  'XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'XDG_CACHE_HOME', 'XDG_RUNTIME_DIR', 'DBUS_SESSION_BUS_ADDRESS',
  'HTTPS_PROXY', 'HTTP_PROXY', 'NO_PROXY', 'https_proxy', 'http_proxy', 'no_proxy', 'NODE_EXTRA_CA_CERTS', 'SSL_CERT_FILE',
];
const agentEnv = names => Object.fromEntries([...BASE_ENV, ...(Array.isArray(names) ? names : [])]
  .filter(k => typeof k === 'string' && process.env[k] !== undefined).map(k => [k, process.env[k]]));

// Kill the agent and anything it started.
function killTree(child) {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
}

// Terminal colour and cursor codes, which some CLIs print even into a pipe.
const stripAnsi = s => s.replace(/\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07]*\x07/g, '');

// A folder name for a run: 2026-11-25_132743.
function stamp() {
  const d = new Date(), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

// ---- Reading replies ----

// Names of labs and models, taken out of what voters read.
const NAMES = /\b(claude|anthropic|opus|sonnet|haiku|codex|openai|chatgpt|gpt[-\w.]*|gemini|antigravity|google|deepmind|mistral|vibe|devstral|le chat)\b/gi;
const anonymise = s => String(s).replace(NAMES, 'an agent');

// IDEA / WHAT / WHY blocks.
function parseIdeas(text) {
  const out = [];
  let cur = null;
  for (const raw of String(text).split('\n')) {
    const line = raw.replace(/^[\s>*_#-]*(?:\d+[.)]\s*)?[\s>*_#-]*/, '');
    const m = /^(IDEA|WHAT|WHY)\s*[:\-–]\s*\**\s*(.*)$/i.exec(line);
    if (m) {
      const key = m[1].toLowerCase();
      if (key === 'idea') { cur = { title: m[2].replace(/\*+$/, '').trim(), what: '', why: '' }; out.push(cur); }
      else if (cur) cur[key] = m[2].trim();
    } else if (cur && line.trim() && !/^```/.test(line)) {
      const key = cur.why ? 'why' : cur.what ? 'what' : null;
      if (key) cur[key] += ' ' + line.trim();
    }
  }
  return out.filter(i => i.title && i.what);
}

// A shuffle that is the same for the same seed.
const seedOf = s => crypto.createHash('sha256').update(String(s)).digest().readUInt32LE(0);
function shuffled(list, seed) {
  let x = seedOf(seed) || 1;
  const r = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// What a voter sees: the others' items in its own shuffled order, numbered from 1.
const ballot = (items, voter, seed) => shuffled(items.filter(i => i.lab !== voter), `${seed}:${voter}`);

// "I3: 7 - reason", "**A** | 8/10 | reason". Scores outside 1-10 are dropped.
function parseScores(text, prefix, count) {
  const out = {};
  const re = new RegExp(`^[\\s>*_#|-]*${prefix}\\s*(\\d+|[A-Z])\\b[*_]*\\s*[:|.)\\-–]+\\s*[*_]*\\s*(\\d{1,2})(?:\\s*/\\s*10)?[*_]*\\s*[|\\-–:]*\\s*(.*)$`, 'i');
  for (const line of String(text).split('\n')) {
    const m = re.exec(line);
    if (!m) continue;
    const key = /^\d+$/.test(m[1]) ? Number(m[1]) : m[1].toUpperCase();
    const score = Number(m[2]);
    if (score < 1 || score > 10 || key in out) continue;
    if (typeof key === 'number' && (key < 1 || key > count)) continue;
    out[key] = { score, why: m[3].replace(/[*_]+/g, '').trim() };
  }
  return out;
}

// Each item's scores from the others and its average; best first. Ties: more scores, then the order given.
function tally(items, votes) {
  const rows = items.map((it, k) => {
    const by = Object.fromEntries(Object.entries(votes).map(([voter, v]) => [voter, v[it.key]]).filter(([, s]) => s));
    const scores = Object.values(by).map(s => s.score);
    return { ...it, by, n: scores.length, mean: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null, order: k };
  });
  return rows.sort((a, b) => (b.mean ?? -1) - (a.mean ?? -1) || b.n - a.n || a.order - b.order);
}

module.exports = { LOOSE, refuseLoose, fill, agentEnv, killTree, stripAnsi, stamp, anonymise, parseIdeas, shuffled, ballot, parseScores, tally };
