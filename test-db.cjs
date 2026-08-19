const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query("SELECT COUNT(*) as count FROM app_state WHERE id LIKE '%@%'")
  .then(res => console.log(res.rows))
  .catch(err => console.error(err))
  .finally(() => pool.end());
