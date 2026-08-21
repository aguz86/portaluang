const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });`;

const replacement = `if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  pool = {
    query: async (text: string, params?: any[]) => {
      try {
        return await pgPool.query(text, params);
      } catch (err: any) {
        if (err && err.code === 'ENETUNREACH' && err.message && err.message.includes(':')) {
            err.message = 'Koneksi database gagal (IPv6 tidak didukung di environment ini). Jika Anda mengatur DATABASE_URL secara manual ke Supabase, gunakan IPv4 connection string (transaction pooler port 6543) atau aktifkan add-on IPv4. Detail: ' + err.message;
        }
        throw err;
      }
    }
  };`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
