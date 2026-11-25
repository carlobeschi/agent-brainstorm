// Hidden check for the notes-cli tags feature, with the syntax the person gives
// when asked: add "text" --tag NAME (repeatable), list --tag NAME.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notes-check-'));
const file = path.join(dir, 'notes.json');
const cli = (...args) => execFileSync('node', [path.join(process.cwd(), 'src', 'cli.js'), ...args], { env: { ...process.env, NOTES_FILE: file }, encoding: 'utf8' });

fs.writeFileSync(file, JSON.stringify({ version: 1, notes: [{ id: 1, text: 'old note from before tags', created: '2026-11-01T10:00:00Z', done: false }] }));

test('an existing version 1 file still loads', () => {
  assert.match(cli('list'), /old note from before tags/);
});
test('add with --tag, then list --tag shows only the tagged notes', () => {
  cli('add', 'buy cat food', '--tag', 'cat');
  cli('add', 'call the vet', '--tag', 'cat', '--tag', 'vet');
  cli('add', 'water the plants');
  const cats = cli('list', '--tag', 'cat');
  assert.match(cats, /buy cat food/);
  assert.match(cats, /call the vet/);
  assert.doesNotMatch(cats, /water the plants|old note/);
  assert.doesNotMatch(cats, /--tag/);
  const vets = cli('list', '--tag', 'vet');
  assert.match(vets, /call the vet/);
  assert.doesNotMatch(vets, /buy cat food/);
});
test('other scripts can still read the file: version 1, the same fields', () => {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.strictEqual(data.version, 1);
  for (const n of data.notes) for (const k of ['id', 'text', 'created', 'done']) assert.ok(k in n, `note ${n.id} lacks ${k}`);
});
