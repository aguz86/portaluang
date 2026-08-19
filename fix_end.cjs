const fs = require('fs');
let data = fs.readFileSync('src/components/TransactionsView.tsx', 'utf8');

data = data.replace(
  /    <\/div>\n  \);\n\};/g,
  `    </div>
    </>
  );
};`
);

fs.writeFileSync('src/components/TransactionsView.tsx', data);
