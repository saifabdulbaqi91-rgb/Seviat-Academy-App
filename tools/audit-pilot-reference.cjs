'use strict';
const { verifyOriginalPdf } = require('./pilot-reference.cjs');
const pilot = require('../unit3-alif-pilot.js');
const map = require('../data/official-curriculum-map.json');
const args = process.argv.slice(2), index = args.indexOf('--pdf');
if (index < 0 || !args[index + 1]) {
  console.error('Usage: node tools/audit-pilot-reference.cjs --pdf <original-textbook.pdf>');
  process.exitCode = 2;
} else {
  console.log(JSON.stringify(verifyOriginalPdf(args[index + 1], { pilot, map })));
}
