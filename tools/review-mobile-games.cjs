const fs=require('fs');let s=fs.readFileSync('student-journey.js','utf8');s=s.replace("options.className='journey-options';", "options.className='journey-options';options.dataset.family=active.node.family||'';");fs.writeFileSync('student-journey.js',s,'utf8');
fs.appendFileSync('afaq-fonts.css',`\n/* Scanning games stay touch friendly without a twenty-row mobile list. */
#journey .journey-options[data-family="attention"],#journey .journey-options[data-family="observation"]{grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#journey .journey-options[data-family="attention"] button,#journey .journey-options[data-family="observation"] button{min-height:64px;padding:6px;font-size:30px}
#journey .journey-options svg{max-width:100%;height:auto}
`);
let runner=fs.readFileSync('tools/run-adaptive-checks.cjs','utf8');runner=runner.replace("const sourceFiles=['index.html'", "const sourceFiles=['afaq-fonts.css','app.js','seviat-sound-settings.js','writing-board.js','index.html'");fs.writeFileSync('tools/run-adaptive-checks.cjs',runner,'utf8');
