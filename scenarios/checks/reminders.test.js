// Hidden check for the reminders task: the agents never see this file.
// Three of the cases follow rules only the person knows (they are given when an agent asks):
//   - a day the month does not have (the 31st in April) -> the last day of that month;
//   - a local time that does not exist (clocks jump forward) -> moved forward by the skipped hour;
//   - a local time that happens twice (clocks go back) -> only the first one.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { runs } = require(path.join(process.cwd(), 'src', 'schedule'));
const iso = (rule, from, n) => runs(rule, new Date(from), n).map(t => t.toISOString().replace('.000', ''));
const L = 'Europe/London', NY = 'America/New_York';

test('daily 09:00 London across the clocks going forward', () => {
  assert.deepStrictEqual(iso({ every: 'day', at: '09:00', tz: L }, '2026-03-27T12:00:00Z', 3), ['2026-03-28T09:00:00Z', '2026-03-29T08:00:00Z', '2026-03-30T08:00:00Z']);
});
test('daily 09:00 London across the clocks going back', () => {
  assert.deepStrictEqual(iso({ every: 'day', at: '09:00', tz: L }, '2026-10-24T00:00:00Z', 3), ['2026-10-24T08:00:00Z', '2026-10-25T09:00:00Z', '2026-10-26T09:00:00Z']);
});
test('weekly Monday 09:00 New York across the US change', () => {
  assert.deepStrictEqual(iso({ every: 'week', at: '09:00', tz: NY, weekday: 1 }, '2026-02-28T00:00:00Z', 3), ['2026-03-02T14:00:00Z', '2026-03-09T13:00:00Z', '2026-03-16T13:00:00Z']);
});
test('weekly Sunday 09:00 London on the day the clocks change', () => {
  assert.deepStrictEqual(iso({ every: 'week', at: '09:00', tz: L, weekday: 7 }, '2026-03-21T00:00:00Z', 2), ['2026-03-22T09:00:00Z', '2026-03-29T08:00:00Z']);
});
test('monthly on the 15th at 09:00 London, March to April', () => {
  assert.deepStrictEqual(iso({ every: 'month', at: '09:00', tz: L, day: 15 }, '2026-03-01T00:00:00Z', 2), ['2026-03-15T09:00:00Z', '2026-04-15T08:00:00Z']);
});
test('monthly on the 31st: the last day of shorter months, then the 31st again (person\'s rule)', () => {
  assert.deepStrictEqual(iso({ every: 'month', at: '09:00', tz: L, day: 31 }, '2026-03-01T00:00:00Z', 4), ['2026-03-31T08:00:00Z', '2026-04-30T08:00:00Z', '2026-05-31T08:00:00Z', '2026-06-30T08:00:00Z']);
});
test('monthly on the 30th in February: the 28th (person\'s rule)', () => {
  assert.deepStrictEqual(iso({ every: 'month', at: '09:00', tz: L, day: 30 }, '2026-01-31T00:00:00Z', 2), ['2026-02-28T09:00:00Z', '2026-03-30T08:00:00Z']);
});
test('01:30 on the night the clocks skip it: moved forward by the hour, 02:30 (person\'s rule)', () => {
  assert.deepStrictEqual(iso({ every: 'day', at: '01:30', tz: L }, '2026-03-28T12:00:00Z', 2), ['2026-03-29T01:30:00Z', '2026-03-30T00:30:00Z']);
});
test('01:30 on the night it happens twice: only the first (person\'s rule)', () => {
  assert.deepStrictEqual(iso({ every: 'day', at: '01:30', tz: L }, '2026-10-24T12:00:00Z', 2), ['2026-10-25T00:30:00Z', '2026-10-26T01:30:00Z']);
});
test('what worked still works: January, both zones', () => {
  assert.deepStrictEqual(iso({ every: 'day', at: '09:00', tz: L }, '2026-01-05T12:00:00Z', 2), ['2026-01-06T09:00:00Z', '2026-01-07T09:00:00Z']);
  assert.deepStrictEqual(iso({ every: 'week', at: '09:00', tz: NY, weekday: 1 }, '2026-01-07T00:00:00Z', 1), ['2026-01-12T14:00:00Z']);
});
