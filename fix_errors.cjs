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
  content = content.replace(/\{@\}\{settings\.appName\}\{\}/g, "@{settings.appName}");
  content = content.replace(/\{ \}\{settings\.appName\}\{\}/g, " {settings.appName}");
  content = content.replace(/\{settings\.appName\}\{\.\}/g, "{settings.appName}.");
  content = content.replace(/\{settings\.appName\}\{ \}/g, "{settings.appName} ");
  
  content = content.replace(/>\{([^{}]*)\}\{settings\.appName\}\{([^{}]*)\}</g, (match, p1, p2) => {
    return `>{'${p1}'}{settings.appName}{'${p2}'}<`;
  });
  
  fs.writeFileSync(file, content);
}
