const { execSync } = require('child_process');
const output = execSync('git log --oneline -- page.tsx', { cwd: 'src/app/p/[slug]' }).toString();
console.log(output);
