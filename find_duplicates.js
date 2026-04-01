const fs = require('fs');
const path = require('path');

const localesDir = 'c:/Users/ASUS/Salon-App/queue-frontend/src/locales';
const files = ['en.json', 'hi.json', 'es.json', 'ar.json'];

files.forEach(file => {
    const filePath = path.join(localesDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const counts = {};

    console.log(`\nChecking ${file}:`);
    lines.forEach((line, index) => {
        const match = line.match(/^  "([^"]+)": {/);
        if (match) {
            const key = match[1];
            counts[key] = (counts[key] || 0) + 1;
            if (counts[key] > 1) {
                console.log(`  DUPLICATE KEY: "${key}" found at line ${index + 1}`);
            }
        }
    });

    if (Object.values(counts).every(c => c === 1)) {
        console.log('  No duplicate top-level keys found.');
    }
});
