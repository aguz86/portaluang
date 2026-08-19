const fs = require('fs');
let content = fs.readFileSync('src/pages/Register.tsx', 'utf8');

// Ensure useGlobalSettings is correctly used
if (!content.includes('const { settings } = useGlobalSettings();')) {
  if (content.includes('import { useGlobalSettings }')) {
    content = content.replace(
      /export default function Register\(\) \{/,
      `export default function Register() {\n  const { settings } = useGlobalSettings();`
    );
  }
}

fs.writeFileSync('src/pages/Register.tsx', content);
