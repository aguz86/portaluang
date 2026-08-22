const fs = require('fs');

// 1. Fix server.ts
let serverContent = fs.readFileSync('server.ts', 'utf8');
serverContent = serverContent.replace("/api/admin/loin", "/api/admin/login");
serverContent = serverContent.replace("password === 'Admin@12'", "password === 'Admin@123'");
fs.writeFileSync('server.ts', serverContent);

// 2. Fix AdminLogin.tsx
let clientContent = fs.readFileSync('src/pages/admin/AdminLogin.tsx', 'utf8');
clientContent = clientContent.replace("password.length <= 8", "password.length >= 8");
clientContent = clientContent.replace("Maksimal 8 karakter", "Minimal 8 karakter");
fs.writeFileSync('src/pages/admin/AdminLogin.tsx', clientContent);
