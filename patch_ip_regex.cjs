const fs = require('fs');

const path = 'src/pages/admin/AdminSecurity.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldRegex = `const ipPattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipPattern.test(newIp.trim())) {
      setError('Format IP address tidak valid. Contoh: 192.168.1.1');`;

const newRegex = `const isIpv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(newIp.trim());
    const isIpv6 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/.test(newIp.trim());
    
    if (!isIpv4 && !isIpv6) {
      setError('Format IP address tidak valid. Contoh: 192.168.1.1 (IPv4) atau 2404:c0:b201... (IPv6)');`;

content = content.replace(oldRegex, newRegex);

fs.writeFileSync(path, content, 'utf8');
