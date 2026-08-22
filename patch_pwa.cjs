const fs = require('fs');
let hook = fs.readFileSync('src/hooks/usePWAInstall.ts', 'utf8');

if (!hook.includes('hasDeferredPrompt: boolean;')) {
  hook = hook.replace('  shouldShowBanner: boolean;\n}', '  shouldShowBanner: boolean;\n  hasDeferredPrompt: boolean;\n}');
  hook = hook.replace('    shouldShowBanner: shouldShowBanner && !isStandalone && !isInstalled,\n  };', '    shouldShowBanner: shouldShowBanner && !isStandalone && !isInstalled,\n    hasDeferredPrompt: !!deferredPrompt,\n  };');
  fs.writeFileSync('src/hooks/usePWAInstall.ts', hook);
}
