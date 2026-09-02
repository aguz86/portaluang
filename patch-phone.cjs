const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const anchor = "{/* PAYMENT DETAILS BLOCK */}";
const phoneInput = `
                {/* Phone Number Input for E-Wallets */}
                {['OV', 'SP', 'DA', 'LQ'].includes(paymentMethod) && (
                  <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 my-4 animate-fadeIn">
                    <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                      Nomor Handphone Terdaftar (Wajib untuk OVO)
                    </label>
                    <input 
                      type="tel"
                      value={ewalletPhone}
                      onChange={(e) => setEwalletPhone(e.target.value)}
                      placeholder="Contoh: 081234567890"
                      className="w-full bg-stone-950 border border-stone-800 focus:border-amber-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    />
                  </div>
                )}
                
                {/* PAYMENT DETAILS BLOCK */}`;

if (code.includes(anchor)) {
  code = code.replace(anchor, phoneInput);
  fs.writeFileSync('src/pages/Checkout.tsx', code);
  console.log('Added phone input successfully');
} else {
  console.log('Could not find anchor');
}
