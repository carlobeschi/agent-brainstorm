const fs = require('fs');
const { topWords } = require('./top');
for (const [w, c] of topWords(fs.readFileSync(process.argv[2], 'utf8'), Number(process.argv[3] || 10))) console.log(`${c}\t${w}`);
