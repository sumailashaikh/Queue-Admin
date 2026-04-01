const fs = require('fs');
const path = require('path');

const filePath = 'c:/Users/ASUS/Salon-App/queue-frontend/src/locales/en.json';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
    if (line.includes('"providers":')) {
        console.log(`${index + 1}: ${line.trim()}`);
    }
});
