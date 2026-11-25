const fs = require('fs');
const { importContacts } = require('./import');
const r = importContacts(fs.readFileSync(process.argv[2], 'utf8'));
console.log(JSON.stringify(r.contacts, null, 2));
console.error(`${r.contacts.length} contacts, ${r.skipped} skipped`);
