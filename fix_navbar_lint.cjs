const fs = require('fs');

let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

content = content.replace(/t\.categoryId === cat\.id/g, "t.category === cat.id");
content = content.replace(/cat\.amount/g, "cat.planned");

fs.writeFileSync('src/components/Navbar.tsx', content);
