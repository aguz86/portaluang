const fs = require('fs');
let modal = fs.readFileSync('src/components/InstallAppModal.tsx', 'utf8');

// 1. Destructure hasDeferredPrompt
modal = modal.replace(
  'const { platform, browser, promptInstall, isStandalone } = pwa;',
  'const { platform, browser, promptInstall, isStandalone, hasDeferredPrompt } = pwa;'
);

// 2. Android Steps replacement
const androidStepsOld = `<div className="space-y-2 text-xs text-stone-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Ketuk tombol <span className="text-emerald-400 font-bold">"Pasang Aplikasi Sekarang"</span> di bawah ini.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Atau ketuk menu <b>titik tiga (⋮)</b> di browser Chrome/Edge ➔ pilih <span className="text-cyan-400 font-semibold">"Instal aplikasi"</span> atau <span className="text-cyan-400 font-semibold">"Tambahkan ke Layar Utama"</span>.
                  </div>
                </div>
              </div>`;

const androidStepsNew = `<div className="space-y-2 text-xs text-stone-300">
                {!hasDeferredPrompt ? (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                    <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-[11px] sm:text-xs leading-relaxed">
                      Ketuk menu <b>titik tiga (⋮)</b> di browser Chrome/Edge ➔ pilih <span className="text-cyan-400 font-semibold">"Instal aplikasi"</span> atau <span className="text-cyan-400 font-semibold">"Tambahkan ke Layar Utama"</span>.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                      <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-[11px] sm:text-xs leading-relaxed">
                        Ketuk tombol <span className="text-emerald-400 font-bold">"Pasang Aplikasi Sekarang"</span> di bawah ini.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                      <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-[11px] sm:text-xs leading-relaxed">
                        Atau ketuk menu <b>titik tiga (⋮)</b> di browser Chrome/Edge ➔ pilih <span className="text-cyan-400 font-semibold">"Instal aplikasi"</span> atau <span className="text-cyan-400 font-semibold">"Tambahkan ke Layar Utama"</span>.
                      </div>
                    </div>
                  </>
                )}
              </div>`;

modal = modal.replace(androidStepsOld, androidStepsNew);

// 3. Desktop Steps replacement
const desktopStepsOld = `<div className="space-y-2 text-xs text-stone-300">
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    1
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Klik tombol <span className="text-amber-400 font-bold">"Pasang di Komputer"</span> di bawah.
                  </div>
                </div>
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                  <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                    2
                  </div>
                  <div className="text-[11px] sm:text-xs leading-relaxed">
                    Atau klik ikon install <Download className="w-3 h-3 inline text-cyan-400 mx-0.5" /> di ujung kanan Address Bar browser Kamu.
                  </div>
                </div>
              </div>`;

const desktopStepsNew = `<div className="space-y-2 text-xs text-stone-300">
                {!hasDeferredPrompt ? (
                  <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                    <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="text-[11px] sm:text-xs leading-relaxed">
                      Klik ikon install <Download className="w-3 h-3 inline text-cyan-400 mx-0.5" /> di ujung kanan Address Bar browser Kamu.
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                      <div className="w-5 h-5 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                        1
                      </div>
                      <div className="text-[11px] sm:text-xs leading-relaxed">
                        Klik tombol <span className="text-amber-400 font-bold">"Pasang di Komputer"</span> di bawah.
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-stone-900/70 border border-stone-800/70">
                      <div className="w-5 h-5 rounded-md bg-stone-800 text-stone-400 flex items-center justify-center font-black text-[11px] shrink-0 mt-0.5">
                        2
                      </div>
                      <div className="text-[11px] sm:text-xs leading-relaxed">
                        Atau klik ikon install <Download className="w-3 h-3 inline text-cyan-400 mx-0.5" /> di ujung kanan Address Bar browser Kamu.
                      </div>
                    </div>
                  </>
                )}
              </div>`;
              
modal = modal.replace(desktopStepsOld, desktopStepsNew);

// 4. Button conditional replacement
const buttonOld = `{platform !== 'ios' ? (
            <button
              onClick={handleActionClick}`;
              
const buttonNew = `{(platform !== 'ios' && hasDeferredPrompt) ? (
            <button
              onClick={handleActionClick}`;

modal = modal.replace(buttonOld, buttonNew);

fs.writeFileSync('src/components/InstallAppModal.tsx', modal);
