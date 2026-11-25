const test = require('node:test');
const assert = require('node:assert');
const { topWords } = require('../src/top');

test('counts and sorts', () => {
  assert.deepStrictEqual(topWords('b a b c b a', 2), [['b', 3], ['a', 2]]);
});
test('apostrophes inside a word stay', () => {
  assert.deepStrictEqual(topWords("Don't don't 'quoted'", 5), [["don't", 2], ['quoted', 1]]);
});
