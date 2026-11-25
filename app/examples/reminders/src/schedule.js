// When does a reminder fire next?
// rule: { every: 'day' | 'week' | 'month', at: 'HH:MM', tz, weekday?: 1-7, day?: 1-31 }
const { localParts, fromLocal } = require('./tz');

const DAY = 24 * 60 * 60 * 1000;

function firstRun(rule, after) {
  const [h, mi] = rule.at.split(':').map(Number);
  const p = localParts(after, rule.tz);
  if (rule.every === 'month') return fromLocal({ y: p.y, mo: p.mo, d: rule.day, h, mi }, rule.tz);
  let t = fromLocal({ y: p.y, mo: p.mo, d: p.d, h, mi }, rule.tz);
  if (rule.every === 'week') while (localParts(t, rule.tz).wd !== rule.weekday) t = new Date(t.getTime() + DAY);
  return t;
}

function step(t, rule) {
  if (rule.every === 'day') return new Date(t.getTime() + DAY);
  if (rule.every === 'week') return new Date(t.getTime() + 7 * DAY);
  const n = new Date(t);
  n.setUTCMonth(n.getUTCMonth() + 1);
  return n;
}

// The first time the rule fires strictly after `after` (a Date).
function nextRun(rule, after) {
  let t = firstRun(rule, after);
  while (t <= after) t = step(t, rule);
  return t;
}

// The next `count` runs after `after`.
function runs(rule, after, count) {
  const out = [];
  let t = after;
  for (let i = 0; i < count; i++) { t = nextRun(rule, t); out.push(t); }
  return out;
}

module.exports = { nextRun, runs };
