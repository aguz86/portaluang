const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const regex = /<div className="space-y-6">\s*{duitkuMethods && duitkuMethods\.length > 0 \? \(\s*<>\s*\{\/\* Instant Payment Section \*\/\}([\s\S]*?)<\/>\s*\)\s*:\s*\([\s\S]*?Memuat metode pembayaran...<\/span>\s*<\/div>\s*\)\s*}\s*<\/div>/g;

const match = regex.exec(code);
if (match) {
  const newBlock = `
                <div className="space-y-6">
                  {duitkuMethods && duitkuMethods.length > 0 ? (
                    (() => {
                      const instantMethods = duitkuMethods.filter((m: any) => ['SP', 'OV', 'DA', 'LQ', 'NQ', 'GP', 'AQ'].includes(m.paymentMethod));
                      const vaMethods = duitkuMethods.filter((m: any) => ['BC', 'M2', 'BR', 'B1', 'NC', 'VA', 'B4', 'I1', 'M1', 'BT', 'S1', 'MB'].includes(m.paymentMethod));
                      const retailMethods = duitkuMethods.filter((m: any) => ['A1', 'AL', 'FT', 'IR'].includes(m.paymentMethod));
                      
                      return (
                        <>
                          {/* Instant Payment Section */}
                          {instantMethods.length > 0 && (
                            <div className="space-y-3">
                              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Instant Payment</span>
                                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {instantMethods.map((m: any) => (
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
                          )}

                          {/* Virtual Account Section */}
                          {vaMethods.length > 0 && (
                            <div className="space-y-3">
                              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Virtual Account</span>
                                <Building2 className="w-3.5 h-3.5 text-stone-500" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {vaMethods.map((m: any) => (
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
                          )}

                          {/* Retail / Others Section */}
                          {retailMethods.length > 0 && (
                            <div className="space-y-3">
                              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Retail & Others</span>
                                <Wallet className="w-3.5 h-3.5 text-stone-500" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                {retailMethods.map((m: any) => (
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
                          )}
                        </>
                      );
                    })()
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 bg-stone-900 border border-stone-800 rounded-2xl">
                      <Loader2 className="w-8 h-8 text-stone-500 animate-spin mb-3" />
                      <span className="text-xs text-stone-400">Memuat metode pembayaran...</span>
                    </div>
                  )}
                </div>`;
  
  code = code.replace(match[0], newBlock);
  fs.writeFileSync('src/pages/Checkout.tsx', code);
  console.log('Sections logic updated');
} else {
  console.log('Match not found');
}
