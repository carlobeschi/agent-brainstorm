// Hidden check for the calc task (spec in the project's README).
const test = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { evaluate } = require(path.join(process.cwd(), 'src', 'calc'));
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, `${a} is not ${b}`);
const throwsAt = (expr, n, re = /./) => assert.throws(() => evaluate(expr), e => re.test(e.message) && new RegExp(`at position ${n}$`).test(e.message), `"${expr}" should fail at position ${n}`);

test('precedence: * before +', () => { near(evaluate('2 + 3 * 4'), 14); near(evaluate('2 * 3 + 4'), 10); });
test('left to right for - and /', () => { near(evaluate('10 - 4 - 3'), 3); near(evaluate('100 / 10 / 5'), 2); });
test('parentheses, nested', () => { near(evaluate('(2 + 3) * 4'), 20); near(evaluate('2 * ((3 + 4) * (1 + 1))'), 28); });
test('power groups from the right and binds tighter', () => { near(evaluate('2 ^ 3 ^ 2'), 512); near(evaluate('2 * 3 ^ 2'), 18); });
test('unary minus', () => { near(evaluate('-3 + 5'), 2); near(evaluate('2 * -3'), -6); near(evaluate('-(1 + 2)'), -3); near(evaluate('-2 ^ 2'), -4); });
test('decimals and no spaces', () => { near(evaluate('0.5*(1.5+2.5)'), 2); near(evaluate('12.25-0.25'), 12); });
test('what worked still works', () => { near(evaluate('1 + 2'), 3); near(evaluate('7'), 7); });
test('an operator with nothing after it: error at the end', () => { throwsAt('2 +', 3); });
test('an unclosed bracket: error at the end', () => { throwsAt('(1 + 2', 6); });
test('an unknown character: error at its position', () => { throwsAt('2 $ 3', 2); });
test('a closing bracket too many: error at its position', () => { throwsAt('1 + 2)', 5); });
test('division by zero names the slash', () => { throwsAt('4 / (2 - 2)', 2, /^division by zero/); });
