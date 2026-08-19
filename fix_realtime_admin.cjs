const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');

// The payload object replacement
content = content.replace(
  /const payload = \{\n\s*pixelId,\n\s*capiToken,\n\s*maintenance,\n\s*socials\n\s*\};/,
  `const payload = {
        pixelId,
        capiToken,
        maintenance,
        socials,
        appName,
        appVersion,
        supportEmail
      };`
);

// We should also initialize these fields if they exist in fetch('/api/admin/settings')
// Wait, AdminSettings fetches them?
// Let's check if AdminSettings does a fetch on mount.
// It seems the original AdminSettings didn't fetch them, maybe it was hardcoded or it fetched?

fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
