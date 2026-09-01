const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const calculations = `  const selectedPlan = SUBSCRIPTION_PLANS.find(p => p.id === selectedPlanId) || SUBSCRIPTION_PLANS[3];
  const isTrial = selectedPlan.id === 'free_trial';

  // Pricing calculations
  const originalPrice = selectedPlan.originalPrice || selectedPlan.price;
  const baseDiscount = selectedPlan.originalPrice ? selectedPlan.originalPrice - selectedPlan.price : 0;
  
  let extraVoucherDiscount = 0;
  if (appliedVoucher && selectedPlan.price > 0) {
    if (appliedVoucher.type === 'percent') {
      extraVoucherDiscount = Math.round((selectedPlan.price * appliedVoucher.discount) / 100);
    } else {
      extraVoucherDiscount = Math.min(appliedVoucher.discount, selectedPlan.price);
    }
  }

  // Prorated discount calculation for upgrades
  let proratedDiscount = 0;
  if (isRenewMode && userProfile.subscription && userProfile.subscription.status === 'active' && userProfile.subscription.planId !== 'free_trial' && selectedPlan.price > 0) {
    const expiresAt = new Date(userProfile.subscription.expiresAt).getTime();
    const now = Date.now();
    const remainingMs = expiresAt - now;
    
    if (remainingMs > 0) {
      const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24));
      const oldPlan = SUBSCRIPTION_PLANS.find(p => p.id === userProfile.subscription.planId);
      if (oldPlan && oldPlan.durationDays) {
         const dailyRate = oldPlan.price / oldPlan.durationDays;
         proratedDiscount = Math.floor(dailyRate * remainingDays);
         
         // Cap the prorated discount to max 80% of new plan price so they still pay something for upgrade
         if (proratedDiscount > selectedPlan.price * 0.8) {
             proratedDiscount = Math.floor(selectedPlan.price * 0.8);
         }
      }
    }
  }

  const finalTotal = Math.max(0, selectedPlan.price - extraVoucherDiscount - proratedDiscount);
`;

// Remove the calculations from their original place
code = code.replace(calculations, '');

// Insert them before duitkuMethods
const insertTarget = "  const [duitkuMethods, setDuitkuMethods] = useState<any[]>([]);";
code = code.replace(insertTarget, calculations + "\n" + insertTarget);

fs.writeFileSync('src/pages/Checkout.tsx', code);
console.log('Patched Checkout.tsx');
