// The online demo: the app's own page, replaying runs saved on someone's computer.
// Nothing runs here: no agents, no server. This file loads before page.js, answers
// its /api/ calls from the saved runs (demo/runs.js sets window.DEMO), and shows a
// few slides before each replay. Agent text is always set as text, never as HTML.
(() => {
  const DEMO = window.DEMO || { runs: [] };
  if (!location.hash.includes('k=')) location.hash = 'k=demo';
  const LENGTH = 90000; // a whole run replays in about a minute and a half, at 1x
  let playing = null; // { run, t0, speed }

  // ---- The saved run as it was at a moment of the replay ----
  const PHASES = ['brief', 'questions', 'research', 'ideas', 'vote', 'choose', 'build'];
  function stateAt(run, now) {
    const S = run.state, start = Date.parse(S.started), end = Date.parse(S.finished || S.started);
    const speed = Math.max(1e-3, (end - start) / LENGTH) * playing.speed;
    const r = start + (now - playing.t0) * speed; // the moment of the real run we are at
    const wall = t => playing.t0 + (t - start) / speed; // that moment on this screen's clock
    const over = r >= end;
    const X = JSON.parse(JSON.stringify(S));
    X.started = new Date(wall(start)).toISOString();
    X.finished = over ? new Date(wall(end)).toISOString() : null;
    X.replay = Math.round(speed);
    const done = n => { const st = S.steps[n]; return st && st.started + (st.ms || 0) <= r; };
    X.steps = {};
    for (const [n, st] of Object.entries(S.steps)) {
      if (!st.started || st.started > r) continue;
      X.steps[n] = done(n) ? { ...st, started: wall(st.started) } : { ...st, status: 'running', started: wall(st.started), ms: null, why: null, reply: '', live: { out: '', err: '' } };
    }
    const allDone = p => S.agents.every(a => !S.steps[`${p}/${a.id}`] || done(`${p}/${a.id}`)) && S.agents.some(a => S.steps[`${p}/${a.id}`]);
    let phase = 'setup';
    for (const p of PHASES) if (Object.keys(X.steps).some(k => k.startsWith(p + '/'))) phase = p;
    if (S.decide === 'me' && allDone('vote') && !Object.keys(X.steps).some(k => k.startsWith('build/'))) phase = 'choose';
    X.phase = over ? S.phase : phase;
    const shownBy = p => a => done(`${p}/${a}`);
    if (S.research) X.research = Object.fromEntries(Object.entries(S.research).filter(([a]) => shownBy('research')(a)));
    X.ideas = S.ideas && S.ideas.filter(i => shownBy('ideas')(i.agent));
    if (X.ideas && !X.ideas.length) X.ideas = null;
    if (!(over || allDone('vote'))) for (const k of ['votes', 'ranking', 'winners', 'voter_means', 'agents_winners', 'tie_at_cut']) X[k] = null;
    if (!over && X.winners_by) X.winners_by = allDone('vote') && phase === 'build' ? S.winners_by : null;
    X.builds = S.builds && (over || phase === 'build') ? Object.fromEntries(Object.entries(S.builds).filter(([a]) => over || done(`build/${a}`))) : null;
    const iso = t => new Date(wall(Date.parse(t))).toISOString();
    X.questions = (S.questions || []).filter(q => Date.parse(q.asked) <= r).map(q => q.answered && Date.parse(q.answered) <= r ? { ...q, asked: iso(q.asked), answered: iso(q.answered) } : { ...q, asked: iso(q.asked), answer: null, answered: null });
    // An agent waiting for an answer shows as asking, as it did live.
    for (const q of X.questions) if (!q.answered && X.steps[q.step]) X.steps[q.step].status = 'asking';
    if (X.human) { if (X.human.pick && !(Date.parse(X.human.pick.at) <= r)) X.human.pick = null; if (!over) X.human.ratings = null; }
    if (!over) X.error = null;
    return X;
  }

  // ---- The API page.js calls ----
  const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, opts = {}) => {
    const u = new URL(url, location.href);
    if (!u.pathname.startsWith('/api/') && !u.pathname.includes('/api/')) return realFetch(url, opts);
    const p = u.pathname.slice(u.pathname.indexOf('/api/') + 5).split('/').filter(Boolean).map(decodeURIComponent);
    if ((opts.method || 'GET') !== 'GET') return json({ error: 'This is a demo: it replays a saved run. Install the app to run your own.' }, 400);
    if (p[0] === 'agents') return json({ file: 'demo', out: 'demo', presets: [], instructions: [{ id: 'claude', label: 'Claude' }], agents: [] });
    if (p[0] !== 'runs') return json({ error: 'not in the demo' }, 404);
    if (!playing) return json([]);
    const S = stateAt(playing.run, Date.now());
    if (p.length === 1) return json([{ id: S.id, problem: S.problem.slice(0, 160), phase: S.phase, started: S.started, agents: S.agents.map(a => a.label) }]);
    if (p[2] === 'file') {
      const f = playing.run.files[u.searchParams.get('path') || ''];
      return f != null ? new Response(f, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }) : json({ error: 'This file is not part of the demo. In the app, every file of the run can be opened.' }, 404);
    }
    return json(S);
  };

  // ---- Slides, then the replay ----
  const h = (tag, attrs, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) k.startsWith('on') ? e.addEventListener(k.slice(2), v) : e.setAttribute(k, v);
    for (const c of kids.flat()) if (c != null) e.append(c instanceof Node ? c : String(c));
    return e;
  };
  const deck = h('div', { class: 'deck', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Demo' });
  const bar = h('div', { class: 'replaybar', hidden: '' });

  function home() {
    playing = null; bar.hidden = true; deck.hidden = false;
    deck.replaceChildren(h('div', { class: 'slide' },
      h('h1', {}, DEMO.title || 'agent-brainstorm, a demo'),
      h('p', {}, DEMO.intro || ''),
      h('div', { class: 'cards' }, DEMO.runs.map((run, k) => h('button', { class: 'pick', onclick: () => slides(k, 0) }, h('b', {}, run.title), h('span', {}, run.subtitle || '')))),
      h('p', { class: 'small' }, 'Everything here is a replay of runs made on a laptop with real agents. ', h('a', { href: DEMO.repo || '#' }, 'Get the app'), ' to run your own.')));
  }
  function slides(k, i) {
    const run = DEMO.runs[k], s = run.slides[i];
    deck.replaceChildren(h('div', { class: 'slide' },
      h('p', { class: 'small' }, `${run.title} · ${i + 1} of ${run.slides.length}`),
      h('h1', {}, s.title),
      ...(s.text || []).map(t => h('p', {}, t)),
      s.image ? h('img', { src: s.image, alt: s.alt || '' }) : null,
      h('div', { class: 'nav' },
        h('button', { onclick: () => (i ? slides(k, i - 1) : home()) }, i ? 'Back' : 'All demos'),
        i + 1 < run.slides.length ? h('button', { class: 'go', onclick: () => slides(k, i + 1) }, 'Next') : h('button', { class: 'go', onclick: () => play(k) }, 'Watch the run'))));
  }
  function play(k, speed = 1) {
    playing = { run: DEMO.runs[k], t0: Date.now(), speed };
    deck.hidden = true; bar.hidden = false;
    const real = Date.parse(playing.run.state.finished) - Date.parse(playing.run.state.started);
    bar.replaceChildren(h('span', {}, `Replay of a real run (${Math.round(real / 60000)} min), sped up`),
      h('button', { onclick: () => play(k, speed) }, 'Restart'),
      h('button', { onclick: () => { const t = Date.now(); const done = (t - playing.t0) * playing.speed; playing.speed = speed === 1 ? 4 : 1; playing.t0 = t - done / playing.speed; speed = playing.speed; bar.querySelector('.speed').textContent = speed === 1 ? 'Faster' : 'Normal speed'; } , class: 'speed' }, 'Faster'),
      h('button', { onclick: () => slides(k, 0) }, 'The slides'),
      h('button', { onclick: home }, 'All demos'));
    if (DEMO.open) DEMO.open(playing.run.state.id);
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.body.append(deck, bar);
    const n = document.getElementById('new');
    n.textContent = 'Demos';
    n.addEventListener('click', e => { e.stopImmediatePropagation(); home(); }, true);
    home();
  });
})();
