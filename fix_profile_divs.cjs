const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Replace the end of the file with correct number of divs
content = content.replace(
  /<\/table>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*};/m,
  '</table>\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};'
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
