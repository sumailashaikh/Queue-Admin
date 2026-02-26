const fs = require('fs');
const { execSync } = require('child_process');
try {
    const output = execSync('git show HEAD:"src/app/p/[slug]/page.tsx"').toString();
    fs.writeFileSync('restored_page.tsx', output);
    console.log('Restored successfully');
} catch (e) {
    console.error(e.message);
}
