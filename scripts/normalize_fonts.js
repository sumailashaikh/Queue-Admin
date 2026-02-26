const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function (file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('c:/Users/ASUS/Salon-App/queue-frontend/src/app/(dashboard)');
files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content.replace(/font-black/g, 'font-bold');
    newContent = newContent.replace(/text-\[10px\]/g, 'text-xs');
    newContent = newContent.replace(/text-\[11px\]/g, 'text-sm');
    newContent = newContent.replace(/tracking-widest/g, 'tracking-wider');

    // Some pages had "tracking-[0.2em]" or similar which might be visually off, let's just make sure everything looks good.
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        console.log('Updated', file);
    }
});
