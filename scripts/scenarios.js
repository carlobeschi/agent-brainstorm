#!/usr/bin/env node
// End-to-end scenarios: real runs through the app's own API, with a scripted person.
//
//   npm run scenarios -- --agents claude,codex            all scenarios
//   npm run scenarios -- --agents claude,codex --only lean-bug
//   npm run scenarios -- --agents claude,codex --set hard   the harder tasks, each with and without help
//   npm run scenarios -- --fake                            the fake agents of the tests (free, offline)
//
// For each scenario in scenarios/scenarios.json it starts a run, answers the
// agents' questions and makes the person's pick as the scenario says, then checks:
//   FLOW:    did the app do what the settings say (phases, questions kept, who chose, every build)?
//   OUTCOME: how did each agent's build do: its own tests, and hidden tests from
//            scenarios/checks/ that the agents never see?
// A report (Markdown and JSON) goes next to the runs. The exit code is 1 if a FLOW check failed:
// outcomes measure the agents, not the app.
//
// The OUTCOME step runs the code each agent wrote (node --test, in a scratch copy, with an
// empty home and only PATH). Pass --no-outcome to skip it.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const flag = name => argv.includes('--' + name);
const opt = name => { const k = argv.indexOf('--' + name); return k >= 0 ? argv[k + 1] : undefined; };
const FAKE = flag('fake');
const SCEN_FILE = opt('file') || path.join(ROOT, 'scenarios', 'scenarios.json');
const CHECKS = path.join(path.dirname(SCEN_FILE), 'checks');
const ONLY = opt('only') ? opt('only').split(',') : null;
const SET = opt('set') || 'basic'; // basic (no "set"), hard, or all
const LIMIT_MIN = Number(opt('minutes')) || (FAKE ? 2 : 60); // per scenario, then the run is stopped
const POLL = FAKE ? 150 : 3000;
const OUTCOME = !flag('no-outcome');

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- The app, on a spare port ----
function freePort() {
  return new Promise(resolve => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
}

async function startApp() {
  const port = Number(opt('port')) || await freePort();
  const env = { ...process.env, BRAINSTORM_PORT: String(port) };
  delete env.BRAINSTORM_OPEN;
  if (FAKE) {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-scenarios-'));
    const fake = path.join(ROOT, 'tests', 'fixtures', 'brainstorm', 'fake.js');
    const agent = id => ({ id, label: `Agent ${id.toUpperCase()}`, read: ['node', fake, 'read', id], research: ['node', fake, 'research', id], web: true, build: ['node', fake, 'build', id] });
    fs.writeFileSync(path.join(home, 'agents.json'), JSON.stringify({ agents: [agent('a'), agent('b')] }));
    Object.assign(env, { BRAINSTORM_HOME: home, BRAINSTORM_AGENTS: path.join(home, 'agents.json'), BRAINSTORM_OUT: path.join(home, 'runs'), BRAINSTORM_INSTRUCTIONS: path.join(home, 'instr') });
  }
  const app = spawn('node', [path.join(ROOT, 'app', 'server.js')], { env, stdio: ['ignore', 'pipe', 'inherit'] });
  const key = await new Promise((resolve, reject) => {
    app.stdout.on('data', d => { const m = /#k=(\w+)/.exec(String(d)); if (m) resolve(m[1]); });
    app.on('exit', code => reject(new Error(`the app exited (${code})`)));
  });
  const api = async (p, body) => {
    const res = await fetch(`http://127.0.0.1:${port}${p}`, { method: body ? 'POST' : 'GET', headers: { 'X-Brainstorm-Key': key, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || res.statusText);
    return j;
  };
  return { app, api, port, key };
}

// ---- The scripted person ----
function answerFor(person, q) {
  for (const a of (person && person.answers) || []) if (!a.match || new RegExp(a.match, 'i').test(q.text)) return a.answer;
  return ''; // let the agent decide
}
// A fixed "random" choice, so a rerun of the same run id picks the same idea.
function pickOne(S) {
  let n = 0;
  for (const c of S.id) n = (n * 31 + c.charCodeAt(0)) >>> 0;
  return S.ideas[n % S.ideas.length].id;
}

// ---- One scenario ----
async function play(api, sc, agents) {
  const body = { ...sc.run, agents };
  if (body.brief_by === 'first') body.brief_by = agents[0];
  const { id } = await api('/api/runs', body);
  log(`${sc.id}: run ${id} started`);
  const started = Date.now(), answered = new Set();
  let S, picked = false, last = '';
  for (;;) {
    S = await api(`/api/runs/${encodeURIComponent(id)}`);
    if (S.phase !== last) { log(`${sc.id}: ${S.phase}`); last = S.phase; }
    if (['done', 'failed', 'stopped'].includes(S.phase)) break;
    if (Date.now() - started > LIMIT_MIN * 60000) { log(`${sc.id}: over ${LIMIT_MIN} minutes, stopping it`); await api(`/api/runs/${encodeURIComponent(id)}/stop`, {}); await sleep(1000); continue; }
    for (const q of (S.questions || []).filter(x => !x.answered && !answered.has(x.id))) {
      const a = answerFor(sc.person, q);
      log(`${sc.id}: ${q.agent} asks (${q.kind}): ${q.text}\n           answer: ${a || '(let it decide)'}`);
      await api(`/api/runs/${encodeURIComponent(id)}/answer`, { answers: { [q.id]: a } });
      answered.add(q.id);
    }
    const pick = sc.person && sc.person.pick;
    const canPick = S.ideas && S.ideas.length && !(S.human && S.human.pick) && (S.human && S.human.blind ? true : S.phase === 'choose');
    if (!picked && canPick && (pick || S.phase === 'choose')) {
      const ids = pick === 'blind-random' ? [pickOne(S)] : pick === 'not-agents' ? [(S.ranking || []).map(r => r.id).filter(x => !(S.winners || []).includes(x)).pop() || S.ideas[0].id] : null;
      await api(`/api/runs/${encodeURIComponent(id)}/human`, { pick: ids ? { ids, why: `scripted: ${pick}` } : { skip: true } });
      log(`${sc.id}: the person picks ${ids ? ids.join(', ') : '(leaves it to the vote)'}`);
      picked = true;
    }
    await sleep(POLL);
  }
  return S;
}

// ---- FLOW: does the app do what the settings say? ----
function flowChecks(sc, S) {
  const out = [], ok = (name, pass, detail = '') => out.push({ name, pass: !!pass, detail });
  const e = sc.expect || {};
  ok('the run finished', S.phase === 'done', S.phase + (S.error ? `: ${S.error}` : ''));
  ok('every agent proposed ideas', S.agents.every(a => (S.ideas || []).some(i => i.agent === a.id)));
  ok('every agent voted', S.agents.every(a => S.steps[`vote/${a.id}`] && S.steps[`vote/${a.id}`].status === 'done'));
  ok('every agent built every winner, with files changed', S.builds && S.agents.every(a => S.builds[a.id] && S.builds[a.id].files.length), S.builds ? S.agents.map(a => `${a.id}: ${(S.builds[a.id] || { files: [] }).files.length} files`).join(', ') : 'no builds');
  if (e.winners_by) ok(`what was built was chosen by ${e.winners_by === 'you' ? 'the person' : 'the agents\' vote'}`, S.winners_by === e.winners_by, String(S.winners_by));
  if (e.brief) ok('an agent wrote the brief from the one-line goal', S.goal && S.problem !== S.goal && S.steps[`brief/${S.brief_by}`] && S.steps[`brief/${S.brief_by}`].status === 'done');
  if (e.research) ok('every agent researched', S.agents.every(a => S.steps[`research/${a.id}`] && S.steps[`research/${a.id}`].status === 'done'));
  if (e.questions === false) ok('no question stopped the run (none allowed)', !(S.questions || []).length);
  if (e.questions === true) {
    ok('each agent had its turn to ask before the start', S.agents.every(a => S.steps[`questions/${a.id}`] && S.steps[`questions/${a.id}`].status === 'done'));
    ok('every question asked was answered and kept in the run', (S.questions || []).every(q => q.answered), `${(S.questions || []).length} asked`);
    const qs = (S.questions || []).filter(q => q.kind === 'start' && q.answered);
    if (qs.length) {
      const p = fs.readFileSync(path.join(S.dir, 'steps', 'ideas', `${S.agents[0].id}.prompt.md`), 'utf8');
      ok('the answers before the start reached every agent\'s ideas prompt', qs.every(q => p.includes(q.answer || '(no answer: use your own judgement)')));
    }
  }
  return out;
}

// ---- OUTCOME: how did each build do? ----
function copyBuild(from) {
  const to = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-check-'));
  fs.cpSync(from, to, { recursive: true, filter: s => !/[/\\](\.git|node_modules)([/\\]|$)/.test(s) });
  return to;
}
function nodeTest(cwd, files) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'brainstorm-home-'));
  const r = spawnSync('node', ['--test', '--test-reporter=tap', ...files], { cwd, encoding: 'utf8', timeout: 120000, env: { PATH: process.env.PATH, HOME: home } });
  const num = k => Number((new RegExp(`^# ${k} (\\d+)`, 'm').exec(r.stdout || '') || [])[1] || 0);
  const failed = (r.stdout || '').split('\n').filter(l => /^not ok \d+ - /.test(l.trim())).map(l => l.trim().replace(/^not ok \d+ - /, ''));
  // Newer Node prints a different summary unless asked for TAP; no count at all means we could not read it.
  return { pass: num('pass'), fail: num('fail'), failed, timedOut: !!r.error, unread: !/^# (pass|fail) \d+/m.test(r.stdout || '') };
}
function outcomes(sc, S) {
  if (!OUTCOME || !sc.outcome || !S.builds) return [];
  // The untouched copy first: what the hidden tests say before anyone did anything.
  const rows = [{ id: '(before)', dir: path.join(S.dir, 'repo') }, ...S.agents.map(a => ({ id: a.id, dir: path.join(S.dir, 'build', a.id) }))];
  return rows.map(a => {
    const dir = a.dir;
    if (!fs.existsSync(dir)) return { agent: a.id, missing: true };
    const res = { agent: a.id, files: (S.builds[a.id] || { files: [] }).files.length };
    if (a.id === '(before)') { res.files = 0; }
    if (sc.outcome.own_tests) { const c = copyBuild(dir); res.own = nodeTest(c, []); }
    if (sc.outcome.hidden) {
      const c = copyBuild(dir);
      fs.rmSync(path.join(c, '.hidden-check'), { recursive: true, force: true });
      fs.mkdirSync(path.join(c, '.hidden-check'));
      fs.copyFileSync(path.join(CHECKS, sc.outcome.hidden), path.join(c, '.hidden-check', sc.outcome.hidden));
      res.hidden = nodeTest(c, [path.join('.hidden-check', sc.outcome.hidden)]);
    }
    const st = Object.entries(S.steps).filter(([k]) => k.endsWith('/' + a.id));
    res.minutes = Math.round(st.reduce((t, [, x]) => t + (x.ms || 0), 0) / 6000) / 10;
    res.help = st.reduce((t, [, x]) => t + (x.asked || 0), 0);
    res.retries = st.filter(([, x]) => x.tries > 1).length;
    return res;
  });
}

// ---- Report ----
function report(results, agents, out) {
  const L = [`# Scenarios, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, '', `Agents: ${agents.join(', ')}${FAKE ? ' (fake agents: no model was called)' : ''}`, ''];
  for (const r of results) {
    const S = r.S || {};
    L.push(`## ${r.sc.id}: ${r.sc.title}`, '', `Run: ${S.dir || '(none)'} · ${S.phase || r.error}${S.started && S.finished ? ` · ${Math.round((Date.parse(S.finished) - Date.parse(S.started)) / 60000)} min` : ''}`, '');
    if (r.error) L.push(`Error: ${r.error}`, '');
    L.push('Flow (the app):', '', ...r.flow.map(c => `- ${c.pass ? '✓' : '✗'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`), '');
    if ((S.questions || []).length) L.push('Questions the agents asked:', '', ...S.questions.map(q => `- ${q.agent}, ${q.kind === 'start' ? 'before the start' : `for help in ${q.step}`}: "${q.text}" → ${q.answer || '(let it decide)'}`), '');
    if (S.winners) L.push(`Built: ${S.winners.map(id => `"${((S.ideas || []).find(i => i.id === id) || {}).title || id}" (${id})`).join('; ')}, chosen by ${S.winners_by === 'you' ? 'the person' : 'the vote'}${S.agents_winners ? `; the vote had picked ${S.agents_winners.join(', ')}` : ''}.`, '');
    if (r.out.length) {
      L.push('Outcome (the agents):', '', '| Agent | Files changed | Own tests | Hidden tests | Minutes | Help asked | Retries |', '|---|---|---|---|---|---|---|');
      const t = x => !x ? '–' : x.timedOut ? 'timed out' : `${x.pass}/${x.pass + x.fail}`;
      for (const o of r.out) L.push(o.missing ? `| ${o.agent} | no build | | | | | |` : o.agent === '(before)' ? `| untouched copy | – | ${t(o.own)} | ${t(o.hidden)} | | | |` : `| ${o.agent} | ${o.files} | ${t(o.own)} | ${t(o.hidden)} | ${o.minutes} | ${o.help} | ${o.retries} |`);
      const fails = r.out.filter(o => o.agent !== '(before)' && o.hidden && o.hidden.failed.length);
      if (fails.length) L.push('', ...fails.map(o => `${o.agent} failed hidden: ${o.hidden.failed.join('; ')}`));
      L.push('');
    }
  }
  const flowFails = results.reduce((t, r) => t + r.flow.filter(c => !c.pass).length, 0);
  L.push(`Flow checks failed: ${flowFails}.`, '', 'Cost: not measured here. With subscriptions (Claude, ChatGPT) a run uses quota, not money; with API keys see each provider\'s usage page.');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  fs.mkdirSync(out, { recursive: true });
  const md = path.join(out, `scenarios-${stamp}.md`);
  fs.writeFileSync(md, L.join('\n') + '\n');
  fs.writeFileSync(md.replace(/\.md$/, '.json'), JSON.stringify(results.map(r => ({ id: r.sc.id, run: r.S && r.S.id, dir: r.S && r.S.dir, phase: r.S && r.S.phase, error: r.error, flow: r.flow, outcome: r.out, questions: r.S && r.S.questions, winners: r.S && r.S.winners, winners_by: r.S && r.S.winners_by })), null, 2));
  return { md, flowFails };
}

async function main() {
  const all = JSON.parse(fs.readFileSync(SCEN_FILE, 'utf8')).scenarios;
  const list = all.filter(s => ONLY ? ONLY.includes(s.id) : SET === 'all' || (s.set || 'basic') === SET);
  if (!list.length) throw new Error(`no scenario called ${ONLY}`);
  const { app, api } = await startApp();
  const stop = () => { try { app.kill(); } catch { /* gone */ } };
  process.on('SIGINT', () => { stop(); process.exit(130); });
  try {
    const info = await api('/api/agents');
    const available = info.agents.filter(a => a.available).map(a => a.id);
    const agents = FAKE ? ['a', 'b'] : opt('agents') ? opt('agents').split(',') : available;
    const missing = agents.filter(a => !available.includes(a));
    if (missing.length) throw new Error(`not installed or not in ${info.file}: ${missing.join(', ')}`);
    if (agents.length < 2) throw new Error('at least two agents are needed');
    log(`scenarios: ${list.map(s => s.id).join(', ')} · agents: ${agents.join(', ')}`);
    const results = [];
    for (const sc of list) {
      let S = null, error = null;
      try { S = await play(api, sc, agents); } catch (e) { error = String(e.message || e); log(`${sc.id}: ${error}`); }
      const flow = S ? flowChecks(sc, S) : [{ name: 'the run started', pass: false, detail: error }];
      const out = S ? outcomes(sc, S) : [];
      const base = out.find(o => o.agent === '(before)');
      if (base && base.hidden) flow.push({ name: 'the hidden tests could be run and counted', pass: !base.hidden.unread && base.hidden.pass + base.hidden.fail > 0, detail: base.hidden.unread ? 'no test summary read' : '' });
      results.push({ sc, S, error, flow, out });
      log(`${sc.id}: flow ${flow.filter(c => c.pass).length}/${flow.length}${out.length ? ' · hidden tests ' + out.filter(o => o.agent !== '(before)').map(o => `${o.agent} ${o.hidden ? `${o.hidden.pass}/${o.hidden.pass + o.hidden.fail}` : '–'}`).join(', ') : ''}`);
    }
    const { md, flowFails } = report(results, agents, opt('out') || info.out);
    log(`report: ${md}`);
    console.log(fs.readFileSync(md, 'utf8'));
    process.exitCode = flowFails ? 1 : 0;
  } finally { stop(); }
}

main().catch(e => { console.error(e.message || e); process.exit(2); });
