const test = require('node:test');
const assert = require('node:assert');
const { runs } = require('../src/schedule');
const iso = list => list.map(t => t.toISOString());

test('daily in January, London', () => {
  assert.deepStrictEqual(iso(runs({ every: 'day', at: '09:00', tz: 'Europe/London' }, new Date('2026-01-05T12:00:00Z'), 2)),
    ['2026-01-06T09:00:00.000Z', '2026-01-07T09:00:00.000Z']);
});

test('weekly on Monday, in January', () => {
  assert.deepStrictEqual(iso(runs({ every: 'week', at: '09:00', tz: 'Europe/London', weekday: 1 }, new Date('2026-01-07T00:00:00Z'), 2)),
    ['2026-01-12T09:00:00.000Z', '2026-01-19T09:00:00.000Z']);
});
