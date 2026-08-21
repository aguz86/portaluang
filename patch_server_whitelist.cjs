const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const target = `      const config = await getDuitkuConfig(pool);
      const now = new Date();`;

const replacement = `      const config = await getDuitkuConfig(pool);

      if (config.env === 'sandbox' && config.sandboxWhitelist && config.sandboxWhitelist.length > 0) {
        const userEmail = email.toLowerCase().trim();
        if (!config.sandboxWhitelist.includes(userEmail)) {
          return res.status(403).json({ 
            success: false, 
            error: 'Sistem pembayaran sedang dalam mode uji coba (Sandbox) internal. Akun email Anda belum diizinkan (whitelisted) untuk mencoba transaksi ini.' 
          });
        }
      }

      const now = new Date();`;

content = content.replace(target, replacement);

fs.writeFileSync('server.ts', content);
