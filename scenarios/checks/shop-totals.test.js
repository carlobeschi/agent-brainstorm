// Hidden check for the shop-totals bug hunt: the agents never see this file.
// Run from a copy of a build folder: node --test checks/shop-totals.test.js
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { total } = require(path.join(process.cwd(), 'src', 'cart'));
const book = { items: [{ sku: 'book', qty: 1 }] }; // one book: €19.90

test('a fixed code takes its amount off, not the whole order (FIVEOFF: €5)', () => {
  assert.strictEqual(total({ ...book, code: 'FIVEOFF' }).total, 1490);
});
test('WELCOME takes €3 off', () => {
  assert.strictEqual(total({ ...book, code: 'WELCOME' }).total, 1690);
});
test('a code typed in lower case still works (save10)', () => {
  assert.strictEqual(total({ ...book, code: 'save10' }).total, 1791);
});
test('what worked still works: SAVE10 and no code', () => {
  assert.strictEqual(total({ ...book, code: 'SAVE10' }).total, 1791);
  assert.strictEqual(total(book).total, 1990);
});
