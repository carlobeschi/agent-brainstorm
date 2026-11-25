# reminders

A small reminder scheduler. Each rule says when a reminder fires, in the local
time of a time zone. `nextRun(rule, after)` gives the next moment it fires.

    node src/cli.js data/rules.json --from 2026-03-25T00:00:00Z --count 5
    node --test

A rule:

    { "name": "stand-up", "every": "day",   "at": "09:00", "tz": "Europe/London" }
    { "name": "review",   "every": "week",  "at": "09:00", "tz": "America/New_York", "weekday": 1 }
    { "name": "rent",     "every": "month", "at": "09:00", "tz": "Europe/London", "day": 31 }

`weekday` goes from 1 (Monday) to 7 (Sunday). No dependencies: time zones come
from Node's built-in `Intl`.

## Reports from users

> Since the clocks changed, my 9:00 stand-up reminder arrives at 10:00.

> My reminder for the 31st showed up on the 1st of May.

> In New York my Monday reminder is an hour off for part of March.
