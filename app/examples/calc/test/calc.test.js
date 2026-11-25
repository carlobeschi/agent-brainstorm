const test = require('node:test');
const assert = require('node:assert');
const { evaluate } = require('../src/calc');

test('adds', () => { assert.strictEqual(evaluate('1 + 2'), 3); });
test('decimals', () => { assert.strictEqual(evaluate('0.5 + 0.25'), 0.75); });
