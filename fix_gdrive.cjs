const fs = require('fs');
let code = fs.readFileSync('src/utils/googleDrive.ts', 'utf8');

// The issue is import.meta.env doesn't exist in standard TS execution if not configured correctly for esbuild/vite sometimes in strict linting,
// we can fix it by asserting it to any

code = code.replace("import.meta.env.VITE_GDRIVE_CLIENT_ID", "(import.meta as any).env.VITE_GDRIVE_CLIENT_ID");

fs.writeFileSync('src/utils/googleDrive.ts', code);
console.log('Fixed googleDrive.ts type issue');
