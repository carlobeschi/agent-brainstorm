// Time zone helpers, on top of Node's built-in Intl.
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const fmt = new Map();

// The local date and time of an instant in a zone. wd: 1 (Monday) to 7 (Sunday).
function localParts(date, tz) {
  if (!fmt.has(tz)) fmt.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }));
  const o = {};
  for (const p of fmt.get(tz).formatToParts(date)) o[p.type] = p.value;
  return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, wd: DAYS.indexOf(o.weekday) + 1 };
}

// How far the zone is ahead of UTC at an instant, in milliseconds.
function offsetAt(ms, tz) {
  const p = localParts(new Date(ms), tz);
  return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - Math.floor(ms / 60000) * 60000;
}

// The instant of a local date and time in a zone.
function fromLocal({ y, mo, d, h, mi }, tz) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  return new Date(guess - offsetAt(guess, tz));
}

module.exports = { localParts, offsetAt, fromLocal };
