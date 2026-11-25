const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix track-loin
code = code.replace(
  "app.post('/api/admin/track-loin'",
  "app.post('/api/admin/track-login'"
);

// Add coupons routes
const couponsRoutes = `
  app.get('/api/admin/coupons', async (req, res) => {
    try {
      const result = await pool.query("SELECT data FROM app_state WHERE id = 'coupons'");
      const coupons = result.rows.length > 0 ? result.rows[0].data : [];
      res.json({ success: true, data: coupons });
    } catch (err) {
      console.error('Error fetching coupons:', err);
      res.status(500).json({ success: false, error: 'Failed to fetch coupons' });
    }
  });

  app.post('/api/admin/coupons', async (req, res) => {
    try {
      const coupons = req.body.coupons;
      
      const check = inspectPayloadForMaliciousContent(coupons);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(
        "INSERT INTO app_state (id, data, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (id) DO UPDATE SET data = $2, updated_at = NOW()",
        ['coupons', JSON.stringify(coupons)]
      );
      res.json({ success: true });
    } catch (err) {
      console.error('Error saving coupons:', err);
      res.status(500).json({ success: false, error: 'Failed to save coupons' });
    }
  });
`;

if (!code.includes('/api/admin/coupons')) {
  code = code.replace(
    "app.get('/api/subscriptions', async (req, res) => {",
    couponsRoutes + "\n  app.get('/api/subscriptions', async (req, res) => {"
  );
}

fs.writeFileSync('server.ts', code);
console.log('Fixed server routes');
