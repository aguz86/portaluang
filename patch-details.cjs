const fs = require('fs');
let code = fs.readFileSync('src/pages/Checkout.tsx', 'utf8');

const anchor = "{/* Action Confirmation Button */}";
const replaceWith = `
                {/* PAYMENT DETAILS BLOCK */}
                {duitkuInvoice && !isTrial && (
                  <div className="bg-stone-950 border border-stone-800 rounded-2xl p-6 space-y-4 animate-fadeIn my-4">
                    
                    {/* QRIS / QR Code */}
                    {(qrDataUrl || duitkuInvoice.qrString) && (
                      <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-800/40">
                          <Zap className="w-3.5 h-3.5" /> Duitku Realtime Instant Settlement &bull; Berlaku 24 Jam
                        </div>
                        <div className="bg-white p-4 rounded-2xl inline-block shadow-2xl max-w-[240px] mx-auto border border-stone-300">
                          <div className="text-[10px] font-black text-slate-800 uppercase tracking-wider mb-2">
                            Scan QR Code Pembayaran
                          </div>
                          {qrDataUrl ? (
                            <img 
                              src={qrDataUrl} 
                              alt="Duitku QR Code" 
                              className="w-48 h-48 mx-auto rounded-lg object-contain"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-48 h-48 flex items-center justify-center bg-stone-100 rounded-lg">
                              <Loader2 className="w-8 h-8 text-stone-500 animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-xs text-stone-300 font-mono bg-stone-900 p-3 rounded-xl border border-stone-800 max-w-sm mx-auto">
                          <span>Nominal Transfer:</span>
                          <strong className="text-amber-400 text-sm">Rp {finalTotal.toLocaleString('id-ID')}</strong>
                        </div>
                      </div>
                    )}

                    {/* Virtual Account / Retail */}
                    {duitkuInvoice.vaNumber && !qrDataUrl && !duitkuInvoice.qrString && (
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-stone-400 uppercase tracking-wider text-center mb-2">
                          Kode Pembayaran / Virtual Account
                        </div>
                        <div className="bg-stone-900 p-4 rounded-xl border border-stone-800 space-y-2">
                          <div className="flex items-center justify-between bg-stone-950 p-3 rounded-xl border border-stone-800">
                            <span className="font-mono text-xl font-bold text-amber-400 tracking-wider">
                              {duitkuInvoice.vaNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(duitkuInvoice.vaNumber || '', 'va')}
                              className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              {copiedField === 'va' ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Tersalin!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Salin</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="text-[11px] text-stone-400 leading-relaxed pt-1 text-center">
                            Gunakan kode pembayaran di atas pada aplikasi m-Banking atau gerai retail yang Anda pilih.
                          </div>
                        </div>
                      </div>
                    )}

                    {/* E-Wallet / Redirect */}
                    {duitkuInvoice.paymentUrl && !duitkuInvoice.vaNumber && !duitkuInvoice.qrString && (
                      <div className="text-center space-y-4">
                        <div className="text-xs text-stone-400 max-w-md mx-auto leading-relaxed">
                          Klik tombol di bawah ini untuk membuka aplikasi E-Wallet atau melanjutkan pembayaran.
                        </div>
                        <a 
                          href={duitkuInvoice.paymentUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-block w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-sm transition-colors"
                        >
                          Buka Pembayaran &amp; Bayar Sekarang
                        </a>
                      </div>
                    )}

                  </div>
                )}
                
                {/* Action Confirmation Button */}`;

if (code.includes(anchor)) {
  code = code.replace(anchor, replaceWith);
  fs.writeFileSync('src/pages/Checkout.tsx', code);
  console.log('Restored payment details successfully');
} else {
  console.log('Could not find anchor');
}
