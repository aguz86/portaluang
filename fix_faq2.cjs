const fs = require('fs');
let content = fs.readFileSync('src/pages/FAQ.tsx', 'utf8');
content = content.replace(/\{Temukan jawaban atas pertanyaan yang sering diajukan mengenai \}\{settings\.appName\}\./g, "Temukan jawaban atas pertanyaan yang sering diajukan mengenai {settings.appName}.");
fs.writeFileSync('src/pages/FAQ.tsx', content);
