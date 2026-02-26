const fs = require('fs');
const path = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\9a4f4fd2-d1bc-4661-aa16-2ac97c42c633\\.system_generated\\logs';
try {
    const files = fs.readdirSync(path);
    for (let file of files) {
        if (file.endsWith('.txt')) {
            let content = fs.readFileSync(path + '\\' + file, 'utf8');
            if (content.includes('p/[slug]/page.tsx')) {
                console.log(file);
            }
        }
    }
} catch (e) { console.error(e); }
