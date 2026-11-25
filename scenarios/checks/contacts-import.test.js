// Hidden check for the contacts-import task: the agents never see this file.
// The duplicate cases follow a rule only the person knows (given when an agent asks):
//   the same email (any case) is one person: keep the most recently updated row,
//   and fill its empty fields from the older rows.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { importContacts } = require(path.join(process.cwd(), 'src', 'import'));
const byEmail = r => Object.fromEntries(r.contacts.map(c => [String(c.email).toLowerCase(), c]));
const H = 'name,email,phone,company,notes,updated\n';

test('a quoted name with a comma stays whole, and the phone stays with its person', () => {
  const c = byEmail(importContacts(H + '"Rossi, Anna",anna@example.com,+39 333,Acme,,2026-10-01\n'))['anna@example.com'];
  assert.strictEqual(c.name, 'Rossi, Anna');
  assert.strictEqual(c.phone, '+39 333');
  assert.strictEqual(c.company, 'Acme');
});
test('doubled quotes inside a quoted field become one quote', () => {
  assert.strictEqual(byEmail(importContacts(H + '"Chloe ""CJ"" Martin",cj@example.net,,,,2026-08-30\n'))['cj@example.net'].name, 'Chloe "CJ" Martin');
});
test('a line break inside a quoted field is part of the field', () => {
  const c = byEmail(importContacts(H + 'Ben,ben@example.org,1,"Okafor & Sons, Ltd","Prefers email.\nNo calls.",2026-09-12\nEva,eva@example.se,2,,,2026-06-01\n'));
  assert.strictEqual(c['ben@example.org'].company, 'Okafor & Sons, Ltd');
  assert.match(c['ben@example.org'].notes, /^Prefers email\.\r?\nNo calls\.$/);
  assert.strictEqual(c['ben@example.org'].updated, '2026-09-12');
  assert.strictEqual(c['eva@example.se'].name, 'Eva');
});
test('Windows line ends leave no stray characters', () => {
  const c = byEmail(importContacts(H.replace('\n', '\r\n') + 'Ada,ada@example.com,1,,,2026-01-02\r\n'))['ada@example.com'];
  assert.strictEqual(c.updated, '2026-01-02');
});
test('a file saved by Excel (with a byte order mark) still has names', () => {
  assert.strictEqual(byEmail(importContacts('﻿' + H + 'Ada,ada@example.com,1,,,2026-01-02\n'))['ada@example.com'].name, 'Ada');
});
test('rows without a usable email are skipped and counted', () => {
  const r = importContacts(H + 'Dan,dan(at)example.com,1,,,2026-07-07\n\nAda,ada@example.com,1,,,2026-01-02\n');
  assert.strictEqual(r.contacts.length, 1);
  assert.strictEqual(r.skipped, 1);
});
test('the same email twice is one contact: the most recent row wins (person\'s rule)', () => {
  const r = importContacts(H + 'Anna Rossi,anna@example.com,+39 333,Acme,,2026-10-01\nANNA ROSSI,Anna@Example.com,,Acme Italia,Moved to Milan,2026-11-02\n');
  assert.strictEqual(r.contacts.length, 1);
  const c = r.contacts[0];
  assert.strictEqual(c.name, 'ANNA ROSSI');
  assert.strictEqual(c.company, 'Acme Italia');
  assert.strictEqual(c.notes, 'Moved to Milan');
});
test('the most recent row is kept even when it comes first, and its empty fields are filled from the older one (person\'s rule)', () => {
  const r = importContacts(H + 'New Name,bo@example.com,,,,2026-11-02\nOld Name,BO@example.com,+44 1,Old Co,old note,2026-01-01\n');
  assert.strictEqual(r.contacts.length, 1);
  const c = r.contacts[0];
  assert.strictEqual(c.name, 'New Name');
  assert.strictEqual(c.phone, '+44 1');
  assert.strictEqual(c.company, 'Old Co');
  assert.strictEqual(c.updated, '2026-11-02');
});
test('the real export: four people, one skipped', () => {
  const r = importContacts(fs.readFileSync(path.join(process.cwd(), 'data', 'export.csv'), 'utf8'));
  assert.deepStrictEqual(r.contacts.map(c => String(c.email).toLowerCase()).sort(), ['anna.rossi@example.com', 'ben@example.org', 'cj@example.net', 'eva@example.se'].sort());
  assert.strictEqual(r.skipped, 1);
  assert.strictEqual(byEmail(r)['anna.rossi@example.com'].phone, '+39 333 1111111');
});
