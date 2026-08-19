const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Remove suggestedFeatures array
content = content.replace(
  /const suggestedFeatures = \[\s*\{[\s\S]*?\}\s*\];/m,
  ''
);

// Remove the section in JSX
content = content.replace(
  /\s*\{\/\* Feature Suggestions \*\/\}\s*<div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm">\s*<h3 className="text-lg font-bold text-stone-100 flex items-center gap-2 mb-1">\s*<Sparkles className="w-5 h-5 text-amber-400" \/>\s*Saran Fitur Profil & Keamanan\s*<\/h3>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m,
  '\n        </div>\n      </div>'
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
