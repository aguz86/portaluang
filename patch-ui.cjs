const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// Function to replace UI logic in Checkout
code = code.replace(
  `{/* Method Tabs: 3 Clean Options (QRIS, VA Bank, E-Wallet) */}`,
  `
  {/* Check active channels from Duitku if available */}
  {(() => {
    const hasDynamic = duitkuMethods && duitkuMethods.length > 0;
    const hasQris = hasDynamic ? duitkuMethods.some(m => m.paymentMethod === 'NQ') : true;
    const activeVA = hasDynamic 
       ? duitkuMethods.filter(m => ['BC', 'M2', 'BR', 'B1', 'NC', 'VA', 'A1', 'I1', 'B8'].includes(m.paymentMethod)) 
       : null;
    const hasVA = hasDynamic ? activeVA.length > 0 : true;
    
    const activeEwallet = hasDynamic
       ? duitkuMethods.filter(m => ['GP', 'SP', 'OV', 'DA', 'LA', 'SA'].includes(m.paymentMethod))
       : null;
    const hasEwallet = hasDynamic ? activeEwallet.length > 0 : true;

    // Reset default selected tab if current tab is suddenly disabled by Duitku
    // (This is a simplified approach, usually done in useEffect, but safe here if we just visually hide disabled tabs)

    // Helper to map Duitku code to our VA keys
    const getVaKey = (code) => {
      switch(code) {
        case 'BC': return 'va_bca';
        case 'M2': return 'va_mandiri';
        case 'BR': return 'va_bri';
        case 'B1': return 'va_bni';
        case 'NC': return 'va_cimb';
        case 'VA': return 'va_permata';
        default: return 'va_'+code.toLowerCase();
      }
    };
    
    const getEwalletKey = (code) => {
      switch(code) {
        case 'GP': return 'gopay';
        case 'SP': return 'shopeepay';
        case 'OV': return 'ovo';
        case 'DA': return 'dana';
        case 'LA': return 'linkaja';
        case 'SA': return 'shopeepay'; // Sometimes code varies
        default: return code.toLowerCase();
      }
    };

    const renderedVaList = activeVA ? activeVA.map(m => getVaKey(m.paymentMethod)) : ['va_bca', 'va_mandiri', 'va_bri', 'va_bni'];
    const renderedEwalletList = activeEwallet ? activeEwallet.map(m => getEwalletKey(m.paymentMethod)) : ['gopay', 'ovo', 'dana', 'shopeepay'];

    return (
      <>
  `
);

// We need to inject the end of the IIFE after the UI rendering for the checkout methods is done.
// The easiest way is to find `{/* Action Confirmation Button */}` and close the fragment and IIFE there.
code = code.replace(
  `{/* Action Confirmation Button */}`,
  `
      </>
    );
  })()}
  {/* Action Confirmation Button */}`
);

// We must also conditionally show the Tabs themselves
code = code.replace(
  `onClick={() => setPaymentMethod('qris')}`,
  `onClick={() => setPaymentMethod('qris')} style={{ display: hasQris ? 'flex' : 'none' }}`
);

code = code.replace(
  `onClick={() => setPaymentMethod('va_bca')}`,
  `onClick={() => setPaymentMethod(renderedVaList[0] || 'va_bca')} style={{ display: hasVA ? 'flex' : 'none' }}`
);

code = code.replace(
  `onClick={() => setPaymentMethod('ewallet')}`,
  `onClick={() => setPaymentMethod('ewallet')} style={{ display: hasEwallet ? 'flex' : 'none' }}`
);

// We must also conditionally map the VA buttons inside TAB 2
code = code.replace(
  `{(['va_bca', 'va_mandiri', 'va_bri', 'va_bni'] as const).map((key) => (`,
  `{(renderedVaList as any[]).map((key) => (`
);

// We must also conditionally map the E-Wallet buttons inside TAB 3
code = code.replace(
  `{(['gopay', 'ovo', 'dana', 'shopeepay'] as const).map((prov) => (`,
  `{(renderedEwalletList as any[]).map((prov) => (`
);

fs.writeFileSync('src/pages/Checkout.tsx', code);
