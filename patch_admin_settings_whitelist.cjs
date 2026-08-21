const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');

const targetState = `  const [duitkuProductionMerchantCode, setDuitkuProductionMerchantCode] = useState('');
  const [duitkuProductionApiKey, setDuitkuProductionApiKey] = useState('');`;
const replacementState = `  const [duitkuProductionMerchantCode, setDuitkuProductionMerchantCode] = useState('');
  const [duitkuProductionApiKey, setDuitkuProductionApiKey] = useState('');
  const [duitkuSandboxWhitelist, setDuitkuSandboxWhitelist] = useState('');`;
content = content.replace(targetState, replacementState);

const targetFetch = `          setDuitkuProductionMerchantCode(data.data.duitkuProductionMerchantCode || '');
          setDuitkuProductionApiKey(data.data.duitkuProductionApiKey || '');`;
const replacementFetch = `          setDuitkuProductionMerchantCode(data.data.duitkuProductionMerchantCode || '');
          setDuitkuProductionApiKey(data.data.duitkuProductionApiKey || '');
          setDuitkuSandboxWhitelist(data.data.duitkuSandboxWhitelist || '');`;
content = content.replace(targetFetch, replacementFetch);

const targetSave = `        duitkuProductionMerchantCode,
        duitkuProductionApiKey,`;
const replacementSave = `        duitkuProductionMerchantCode,
        duitkuProductionApiKey,
        duitkuSandboxWhitelist,`;
content = content.replace(targetSave, replacementSave);

const targetUI = `                </div>
              </div>
            </div>

            {/* Production Credentials */}`;
const replacementUI = `                </div>
                <div className="space-y-1.5 md:col-span-2 mt-2">
                  <label className="text-xs font-bold text-stone-500 tracking-wider">WHITELIST EMAIL PENGUJI SANDBOX (Pisahkan dengan koma)</label>
                  <textarea 
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50 min-h-[60px]"
                    placeholder="admin@portal-uang.com, tester@gmail.com"
                    value={duitkuSandboxWhitelist} 
                    onChange={(e) => setDuitkuSandboxWhitelist(e.target.value)}
                  />
                  <p className="text-[10px] text-stone-500">Jika diisi, hanya email yang terdaftar di atas yang bisa melakukan checkout saat mode Sandbox aktif. Biarkan kosong agar semua pengguna dapat mengujinya.</p>
                </div>
              </div>
            </div>

            {/* Production Credentials */}`;
content = content.replace(targetUI, replacementUI);

fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
