const fs = require('fs');
let content = fs.readFileSync('src/components/LandingLayout.tsx', 'utf8');

content = content.replace(
  /export const LandingLayout: React\.FC<\{ children: React\.ReactNode \}> = \(\{ children \}\) => \{/,
  `export const LandingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {\n  const { settings } = useGlobalSettings();`
);

content = content.replace(
  /<span className="font-extrabold text-lg md:text-xl tracking-tight text-stone-100">\s*AuraLedger\s*<\/span>/,
  `<span className="font-extrabold text-lg md:text-xl tracking-tight text-stone-100">{settings.appName}</span>`
);

fs.writeFileSync('src/components/LandingLayout.tsx', content);
