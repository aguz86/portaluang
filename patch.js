const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  'const appStateDb = new Map();\nconst pool = {\n  query: async (queryStr, params = []) => {',
  `const appStateDb = new Map();\n\nlet pool: any = null;\n\nif (process.env.DATABASE_URL) {\n  const { Pool } = require('pg');\n  pool = new Pool({\n    connectionString: process.env.DATABASE_URL,\n    ssl: { rejectUnauthorized: false }\n  });\n\n  pool.query(\`\n    CREATE TABLE IF NOT EXISTS app_state (\n      id VARCHAR(255) PRIMARY KEY,\n      data JSONB,\n      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n    );\n  \`).catch((err: any) => console.error('Failed to create app_state table in Postgres:', err));\n} else {\n  pool = {\n    query: async (queryStr: any, params: any[] = []) => {`
);
content = content.replace(
  '// Try to extract ID either from params or from literal string in query',
  `}\n};\n}\n// Try to extract ID either from params or from literal string in query`
);
fs.writeFileSync('server.ts', content);
