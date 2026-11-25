const { evaluate } = require('./calc');
try { console.log(evaluate(process.argv.slice(2).join(' '))); } catch (e) { console.error(e.message); process.exitCode = 1; }
