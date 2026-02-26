const { execSync } = require('child_process');
try {
    execSync('git checkout HEAD -- "src/app/p/[slug]/page.tsx"');
    console.log('Checkout completed.');
} catch (e) {
    console.error(e.message);
}
