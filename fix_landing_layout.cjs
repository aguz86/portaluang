const fs = require('fs');

let content = fs.readFileSync('src/components/LandingLayout.tsx', 'utf8');

// Ensure useGlobalSettings is imported
if (!content.includes('useGlobalSettings')) {
  content = content.replace(
    /import \{ Link, useLocation \} from "react-router-dom";/,
    `import { Link, useLocation } from "react-router-dom";\nimport { useGlobalSettings } from "../hooks/useGlobalSettings";`
  );
}

// Add hook call inside component
content = content.replace(
  /export const LandingLayout: React\.FC<LandingLayoutProps> = \(\{ children \}\) => \{/,
  `export const LandingLayout: React.FC<LandingLayoutProps> = ({ children }) => {\n  const { settings } = useGlobalSettings();`
);

// Replace "AuraLedger" with settings.appName
content = content.replace(
  /<span className="font-extrabold text-lg text-stone-100">\s*AuraLedger\s*<\/span>/g,
  `<span className="font-extrabold text-lg text-stone-100">{settings.appName}</span>`
);

content = content.replace(
  /<span className="font-extrabold text-base text-stone-100">\s*AuraLedger\s*<\/span>/g,
  `<span className="font-extrabold text-base text-stone-100">{settings.appName}</span>`
);

// Add version to footer
content = content.replace(
  /<p className="text-stone-400 text-sm mt-8">\s*© 2026 AuraLedger\. Hak Cipta Dilindungi\.\s*<\/p>/g,
  `<p className="text-stone-400 text-sm mt-8">
            © {new Date().getFullYear()} {settings.appName}. Hak Cipta Dilindungi.
            <span className="block mt-1 text-xs text-stone-500">Versi {settings.appVersion}</span>
          </p>`
);

// In case copyright isn't there exactly:
if (!content.includes('© {new Date().getFullYear()} {settings.appName}')) {
  content = content.replace(
    /<p className="text-stone-500 text-xs sm:text-sm">\s*&copy; 2026 AuraLedger\. Hak Cipta Dilindungi\.\s*<\/p>/g,
    `<p className="text-stone-500 text-xs sm:text-sm">
            &copy; {new Date().getFullYear()} {settings.appName}. Hak Cipta Dilindungi.
            <span className="ml-2 px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[10px]">v{settings.appVersion}</span>
          </p>`
  );
  
  content = content.replace(
    /© 2026 AuraLedger/g,
    `© {new Date().getFullYear()} {settings.appName}`
  );
}

// Add initials to logo
content = content.replace(
  /AL\s*<\/div>/g,
  `{settings.appName.substring(0, 2).toUpperCase()}</div>`
);


fs.writeFileSync('src/components/LandingLayout.tsx', content);
