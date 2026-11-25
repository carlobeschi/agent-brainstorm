// Hidden check for the wordfreq task: same output, and fast on a whole book.
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { topWords } = require(path.join(process.cwd(), 'src', 'top'));

test('the rules: lower case, inner apostrophes, ties alphabetical', () => {
  const s = "The cat; the CAT's toy. 'Tis a cat-toy, isn't it? Toy! ''quoted'' don't";
  assert.deepStrictEqual(topWords(s, 50), topWordsRef(s, 50));
});
test('n larger than the number of words', () => { assert.deepStrictEqual(topWords('b a', 10), [['a', 1], ['b', 1]]); });
test('empty text', () => { assert.deepStrictEqual(topWords('', 3), []); });

// A book: 200,000 words over 10,000 different ones.
function book() {
  const letters = i => { let s = ''; do { s = String.fromCharCode(97 + i % 26) + s; i = Math.floor(i / 26); } while (i); return s; };
  const vocab = Array.from({ length: 10000 }, (_, i) => letters(i) + (i % 7 === 0 ? "'s" : ''));
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const out = [];
  for (let i = 0; i < 200000; i++) out.push(vocab[Math.floor(rnd() ** 2 * vocab.length)]);
  return out.join(' ');
}
test('a whole book in under 2 seconds, with the same answer as the rules give', { timeout: 8000 }, () => {
  const text = book();
  const t0 = Date.now();
  const got = topWords(text, 25);
  const ms = Date.now() - t0;
  assert.deepStrictEqual(got, topWordsRef(text, 25));
  assert.ok(ms < 2000, `took ${ms} ms`);
});

test('every word of the book, in order, also fast', { timeout: 8000 }, () => {
  const text = book();
  const t0 = Date.now();
  const got = topWords(text, 1e9);
  const ms = Date.now() - t0;
  assert.deepStrictEqual(got, topWordsRef(text, 1e9));
  assert.ok(ms < 3000, `took ${ms} ms`);
});

function topWordsRef(text, n) {
  const m = new Map();
  for (const w of (text.toLowerCase().match(/[a-z']+/g) || []).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean)) m.set(w, (m.get(w) || 0) + 1);
  return [...m].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, n);
}
