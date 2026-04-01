const fs = require('fs');
const path = require('path');

const localesDir = 'c:/Users/ASUS/Salon-App/queue-frontend/src/locales';
const files = ['en.json', 'hi.json', 'es.json', 'ar.json'];

files.forEach(file => {
    const filePath = path.join(localesDir, file);
    
    try {
        // We use a regex approach to find all top-level keys because JSON.parse already deduplicates by keeping the LAST one.
        // But we want to MERGE them.
        const content = fs.readFileSync(filePath, 'utf8');
        
        // This is a bit complex for a regex, so let's use a simpler approach:
        // 1. Find all lines that look like a top-level key: "key": {
        // 2. Extract those blocks and merge them.
        
        // Actually, a better way is to parse the file multiple times or use a manual parser.
        // Or simpler: just use a library-like logic.
        
        console.log(`Processing ${file}...`);
        
        // This manual approach handles duplicate top-level keys by merging their objects.
        const lines = content.split('\n');
        const root = {};
        let currentKey = null;
        let braceCount = 0;
        let buffer = '';

        lines.forEach(line => {
            const topLevelMatch = line.match(/^  "([^"]+)": \{/);
            if (topLevelMatch && braceCount === 0) {
                currentKey = topLevelMatch[1];
                braceCount = 1;
                buffer = '{';
            } else if (currentKey) {
                buffer += line + '\n';
                const open = (line.match(/\{/g) || []).length;
                const close = (line.match(/\}/g) || []).length;
                braceCount += open - close;
                
                if (braceCount === 0) {
                    // Try to parse the buffer as JSON
                    try {
                        const obj = JSON.parse(buffer);
                        if (!root[currentKey]) root[currentKey] = {};
                        Object.assign(root[currentKey], obj);
                    } catch (e) {
                        console.error(`Error parsing block for ${currentKey}:`, e.message);
                    }
                    currentKey = null;
                }
            }
        });

        // Write the merged JSON back
        fs.writeFileSync(filePath, JSON.stringify(root, null, 2), 'utf8');
        console.log(`Successfully deduplicated ${file}`);

    } catch (err) {
        console.error(`Fatal error in ${file}:`, err.message);
    }
});
