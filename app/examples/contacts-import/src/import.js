// CRM export (CSV) -> address book contacts.
const { parse } = require('./csv');

const FIELDS = ['name', 'email', 'phone', 'company', 'notes', 'updated'];
const looksLikeEmail = s => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);

function importContacts(text) {
  const [header, ...rows] = parse(text);
  const col = Object.fromEntries(header.map((h, i) => [h.toLowerCase(), i]));
  const contacts = [];
  let skipped = 0;
  for (const r of rows) {
    const c = {};
    for (const f of FIELDS) c[f] = col[f] === undefined ? '' : (r[col[f]] || '');
    c.email = c.email.toLowerCase();
    if (!looksLikeEmail(c.email)) { skipped++; continue; }
    contacts.push(c);
  }
  return { contacts, skipped };
}

module.exports = { importContacts };
