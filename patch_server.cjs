const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// Insert the IP whitelist state and endpoints
const endpoints = `
  // Admin IP Whitelist State
  let adminIpWhitelist = [];

  app.get('/api/admin/ip-whitelist', adminAuthMiddleware, (req, res) => {
    res.json({ success: true, ips: adminIpWhitelist });
  });

  app.post('/api/admin/ip-whitelist', adminAuthMiddleware, (req, res) => {
    const { ips } = req.body;
    if (Array.isArray(ips)) {
      adminIpWhitelist = ips;
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, error: 'Invalid data format' });
    }
  });

  // Admin Authentication
`;

content = content.replace('// Admin Authentication', endpoints);

// Update login check
const oldLogin = `
  app.post('/api/admin/login', (req, res) => {
    const { email, password, twoFactor } = req.body;
`;

const newLogin = `
  app.post('/api/admin/login', (req, res) => {
    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    if (Array.isArray(clientIp)) clientIp = clientIp[0];
    const ip = clientIp.split(',')[0].trim();

    if (adminIpWhitelist.length > 0 && !adminIpWhitelist.includes(ip)) {
      return res.status(401).json({ success: false, error: 'Access Denied: IP not whitelisted (' + ip + ')' });
    }

    const { email, password, twoFactor } = req.body;
`;

content = content.replace(oldLogin, newLogin);

fs.writeFileSync('server.ts', content, 'utf8');
