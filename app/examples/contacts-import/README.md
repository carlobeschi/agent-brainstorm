# contacts-import

Imports the contacts exported by the sales team's CRM (a CSV file) into the
JSON our address book reads.

    node src/cli.js data/export.csv > contacts.json
    node --test

`importContacts(text)` returns `{ contacts: [{ name, email, phone, company, notes, updated }], skipped }`.
The columns can come in any order; the first line names them. No dependencies.

## Reports from the sales team

> Since we switched to the new CRM, some names arrive cut in two, and some
> people get someone else's phone number.

> When I export from Excel first, every contact comes in without a name.

> A few people are in the address book twice.
