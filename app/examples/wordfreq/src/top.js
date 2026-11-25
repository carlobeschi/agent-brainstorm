// The n most frequent words of a text, as [word, count] pairs.
function words(text) {
  return (text.toLowerCase().match(/[a-z']+/g) || []).map(w => w.replace(/^'+|'+$/g, '')).filter(Boolean);
}

function topWords(text, n) {
  const all = words(text);
  const seen = [];
  const pairs = [];
  for (const w of all) {
    if (seen.includes(w)) continue;
    seen.push(w);
    pairs.push([w, all.filter(x => x === w).length]);
  }
  pairs.sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  return pairs.slice(0, n);
}

module.exports = { topWords, words };
