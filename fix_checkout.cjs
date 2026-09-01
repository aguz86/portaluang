const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// The original calculations string is probably still there due to a whitespace mismatch.
// Let's remove the second occurrence which happens later.

const idx1 = code.indexOf('const finalTotal = Math.max');
const idx2 = code.indexOf('const finalTotal = Math.max', idx1 + 1);

if (idx2 !== -1) {
    // Find the start of the block to remove
    const startIdx = code.lastIndexOf('  const selectedPlan = SUBSCRIPTION_PLANS.find', idx2);
    if (startIdx !== -1 && startIdx > idx1) {
        // Find the end of the block
        const endIdx = code.indexOf(';', idx2);
        code = code.substring(0, startIdx) + code.substring(endIdx + 1);
        fs.writeFileSync('src/pages/Checkout.tsx', code);
        console.log('Fixed double finalTotal declaration');
    }
}
