const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const targetImport = `import {`;
const replacementImport = `import { encrypt, decrypt } from './server/cryptoUtils';\nimport {`;
content = content.replace(targetImport, replacementImport);

const targetGetSettings = `  app.get('/api/admin/settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      res.json({ success: true, data: result.rows.length > 0 ? result.rows[0].data : {} });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });`;

const replacementGetSettings = `  app.get('/api/admin/settings', async (req, res) => {
    try {
      const result = await pool.query('SELECT data FROM app_state WHERE id = $1', ['global_settings']);
      let data = result.rows.length > 0 ? result.rows[0].data : {};
      
      // Decrypt API keys before sending to frontend
      if (data.duitkuSandboxApiKey) data.duitkuSandboxApiKey = decrypt(data.duitkuSandboxApiKey);
      if (data.duitkuProductionApiKey) data.duitkuProductionApiKey = decrypt(data.duitkuProductionApiKey);
      if (data.duitkuApiKey) data.duitkuApiKey = decrypt(data.duitkuApiKey);
      
      res.json({ success: true, data });
    } catch (err) {
      console.error("Admin settings error:", err); res.status(500).json({ success: false, error: err.message });
    }
  });`;

content = content.replace(targetGetSettings, replacementGetSettings);

const targetPostSettings = `  app.post('/api/admin/settings', async (req, res) => {
    try {
      const data = req.body;
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      await pool.query(`;

const replacementPostSettings = `  app.post('/api/admin/settings', async (req, res) => {
    try {
      const data = req.body;
      const check = inspectPayloadForMaliciousContent(data);
      if (check.isMalicious) {
        return res.status(400).json({ success: false, error: check.reason });
      }

      // Encrypt API keys before saving to DB
      if (data.duitkuSandboxApiKey) data.duitkuSandboxApiKey = encrypt(data.duitkuSandboxApiKey);
      if (data.duitkuProductionApiKey) data.duitkuProductionApiKey = encrypt(data.duitkuProductionApiKey);
      if (data.duitkuApiKey) data.duitkuApiKey = encrypt(data.duitkuApiKey);

      await pool.query(`;

content = content.replace(targetPostSettings, replacementPostSettings);

fs.writeFileSync('server.ts', content);
