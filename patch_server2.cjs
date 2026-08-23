const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const middleware = `
  const adminAuthMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (authHeader === 'Bearer SUPER_SECRET_ADMIN_TOKEN_2026') {
      next();
    } else {
      res.status(401).json({ success: false, error: 'Unauthorized' });
    }
  };
`;

content = content.replace(middleware, '');

content = content.replace(
  '// Admin IP Whitelist State',
  middleware + '\n\n  // Admin IP Whitelist State'
);

fs.writeFileSync('server.ts', content, 'utf8');
