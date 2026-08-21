const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `      } catch (err: any) {
        if (err && err.code === 'ENETUNREACH' && err.message && err.message.includes(':')) {
            err.message = 'Koneksi database gagal (IPv6 tidak didukung di environment ini). Jika Anda mengatur DATABASE_URL secara manual ke Supabase, gunakan IPv4 connection string (transaction pooler port 6543) atau aktifkan add-on IPv4. Detail: ' + err.message;
        }
        throw err;`;

const replacement = `      } catch (err: any) {
        if (err && err.code === 'ENETUNREACH' && err.message && err.message.includes(':')) {
            err.message = 'Koneksi database gagal (IPv6 tidak didukung di environment ini). Jika Anda mengatur DATABASE_URL secara manual ke Supabase, gunakan IPv4 connection string (transaction pooler port 6543) atau aktifkan add-on IPv4. Detail: ' + err.message;
        }
        if (err && err.code === '42P01') { // 42P01 is PostgreSQL error code for undefined_table
            console.log("Table app_state not found, creating it now...");
            await pgPool.query(\`
              CREATE TABLE IF NOT EXISTS app_state (
                id VARCHAR(255) PRIMARY KEY,
                data JSONB,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
              );
            \`);
            try {
               await pgPool.query(\`ALTER TABLE app_state ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;\`);
            } catch (e) {}
            return await pgPool.query(text, params);
        }
        throw err;`;

content = content.replace(target, replacement);
fs.writeFileSync('server.ts', content);
