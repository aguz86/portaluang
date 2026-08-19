const fs = require('fs');

const files = [
  'src/pages/Features.tsx',
  'src/pages/ProLanding.tsx',
  'src/pages/Home.tsx',
  'src/pages/Contact.tsx',
  'src/pages/About.tsx',
  'src/pages/Terms.tsx',
  'src/pages/FAQ.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/>\{'([^']*)'\}\{settings\.appName\}\{'([^']*)'\}</g, ">$1{settings.appName}$2<");
  content = content.replace(/>\{([^{}]*)\}\{settings\.appName\}\{([^{}]*)\}</g, ">$1{settings.appName}$2<");
  fs.writeFileSync(file, content);
}
