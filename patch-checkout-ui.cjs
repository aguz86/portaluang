const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

// Replace state definition
code = code.replace(
  "const [paymentMethod, setPaymentMethod] = useState<'qris' | 'va_bca' | 'va_mandiri' | 'va_bri' | 'va_bni' | 'ewallet'>('qris');",
  "const [paymentMethod, setPaymentMethod] = useState<string>('SP');"
);

// We need to rewrite the rendering block completely.
// Let's find the start of the rendering block.
const startMarker = "<div className=\"grid grid-cols-3 gap-2.5\">";
const endMarker = "{/* Cancel Anytime Trust Badge */}";

const startIdx = code.indexOf(startMarker);
const endIdx = code.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const newUI = `
                <div className="space-y-6">
                  {duitkuMethods && duitkuMethods.length > 0 ? (
                    <>
                      {/* Instant Payment Section */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Instant Payment</span>
                          <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {duitkuMethods.filter((m: any) => ['SP', 'OV', 'DA', 'LQ', 'NQ', 'GP', 'AQ'].includes(m.paymentMethod)).map((m: any) => (
                            <button
                              key={m.paymentMethod}
                              type="button"
                              onClick={() => setPaymentMethod(m.paymentMethod)}
                              className={\`p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 \${
                                paymentMethod === m.paymentMethod
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                                  : 'bg-white border-stone-200 text-stone-800 hover:border-emerald-500 hover:shadow-sm'
                              }\`}
                            >
                              <img src={m.paymentImage} alt={m.paymentName} className="h-6 object-contain" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Virtual Account Section */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Virtual Account</span>
                          <Building2 className="w-3.5 h-3.5 text-stone-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {duitkuMethods.filter((m: any) => ['BC', 'M2', 'BR', 'B1', 'NC', 'VA', 'B4', 'I1', 'M1', 'BT', 'S1', 'MB'].includes(m.paymentMethod)).map((m: any) => (
                            <button
                              key={m.paymentMethod}
                              type="button"
                              onClick={() => setPaymentMethod(m.paymentMethod)}
                              className={\`p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 \${
                                paymentMethod === m.paymentMethod
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                                  : 'bg-white border-stone-200 text-stone-800 hover:border-emerald-500 hover:shadow-sm'
                              }\`}
                            >
                              <img src={m.paymentImage} alt={m.paymentName} className="h-6 object-contain" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Retail / Others Section */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Retail & Others</span>
                          <Wallet className="w-3.5 h-3.5 text-stone-500" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {duitkuMethods.filter((m: any) => ['A1', 'AL', 'FT', 'IR'].includes(m.paymentMethod)).map((m: any) => (
                            <button
                              key={m.paymentMethod}
                              type="button"
                              onClick={() => setPaymentMethod(m.paymentMethod)}
                              className={\`p-3 rounded-2xl border transition-all flex items-center justify-center gap-2 \${
                                paymentMethod === m.paymentMethod
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                                  : 'bg-white border-stone-200 text-stone-800 hover:border-emerald-500 hover:shadow-sm'
                              }\`}
                            >
                              <img src={m.paymentImage} alt={m.paymentName} className="h-6 object-contain" referrerPolicy="no-referrer" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-stone-900 border border-stone-800 rounded-2xl">
                      <Loader2 className="w-8 h-8 text-stone-500 animate-spin mb-3" />
                      <span className="text-xs text-stone-400">Memuat metode pembayaran...</span>
                    </div>
                  )}
                </div>
                
                `;

  code = code.substring(0, startIdx) + newUI + code.substring(endIdx);
  fs.writeFileSync('src/pages/Checkout.tsx', code);
  console.log('UI Patched successfully');
} else {
  console.log('Could not find markers');
}
