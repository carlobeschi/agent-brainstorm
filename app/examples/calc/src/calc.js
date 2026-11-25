// Evaluates arithmetic expressions. See README.md for the spec.
function tokenize(s) {
  return s.match(/\d+(\.\d+)?|[-+*/^]/g) || [];
}

function evaluate(expr) {
  const t = tokenize(expr);
  let acc = Number(t[0]);
  for (let i = 1; i < t.length; i += 2) {
    const op = t[i], n = Number(t[i + 1]);
    if (op === '+') acc += n;
    else if (op === '-') acc -= n;
    else if (op === '*') acc *= n;
    else if (op === '/') acc /= n;
    else if (op === '^') acc = acc ** n;
  }
  return acc;
}

module.exports = { evaluate };
