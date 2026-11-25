const test = require('node:test');
const assert = require('node:assert');
const { importContacts } = require('../src/import');

test('a plain export', () => {
  const r = importContacts('name,email,phone\nAda,ada@example.com,123\n');
  assert.deepStrictEqual(r.contacts.map(c => [c.name, c.email, c.phone]), [['Ada', 'ada@example.com', '123']]);
});

test('columns in another order', () => {
  const r = importContacts('email,name\nbo@example.com,Bo\n');
  assert.strictEqual(r.contacts[0].name, 'Bo');
});
