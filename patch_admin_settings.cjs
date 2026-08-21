const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminSettings.tsx', 'utf8');

const targetState = `  const [duitkuMerchantCode, setDuitkuMerchantCode] = useState('');
  const [duitkuApiKey, setDuitkuApiKey] = useState('');
  const [duitkuEnv, setDuitkuEnv] = useState<'sandbox' | 'production'>('sandbox');`;

const replacementState = `  const [duitkuEnv, setDuitkuEnv] = useState<'sandbox' | 'production'>('sandbox');
  const [duitkuSandboxMerchantCode, setDuitkuSandboxMerchantCode] = useState('');
  const [duitkuSandboxApiKey, setDuitkuSandboxApiKey] = useState('');
  const [duitkuProductionMerchantCode, setDuitkuProductionMerchantCode] = useState('');
  const [duitkuProductionApiKey, setDuitkuProductionApiKey] = useState('');`;

content = content.replace(targetState, replacementState);

const targetFetch = `          setDuitkuMerchantCode(data.data.duitkuMerchantCode || '');
          setDuitkuApiKey(data.data.duitkuApiKey || '');
          setDuitkuEnv(data.data.duitkuEnv || 'sandbox');`;

const replacementFetch = `          setDuitkuEnv(data.data.duitkuEnv || 'sandbox');
          setDuitkuSandboxMerchantCode(data.data.duitkuSandboxMerchantCode || data.data.duitkuMerchantCode || '');
          setDuitkuSandboxApiKey(data.data.duitkuSandboxApiKey || data.data.duitkuApiKey || '');
          setDuitkuProductionMerchantCode(data.data.duitkuProductionMerchantCode || '');
          setDuitkuProductionApiKey(data.data.duitkuProductionApiKey || '');`;

content = content.replace(targetFetch, replacementFetch);

const targetSave = `        duitkuMerchantCode,
        duitkuApiKey,
        duitkuEnv,`;

const replacementSave = `        duitkuEnv,
        duitkuSandboxMerchantCode,
        duitkuSandboxApiKey,
        duitkuProductionMerchantCode,
        duitkuProductionApiKey,`;

content = content.replace(targetSave, replacementSave);

const targetUI = `          <div className="space-y-4 mt-6">
            {messages['duitku'] && (
              <div className={\`p-4 rounded-xl flex items-center gap-3 \${
                messages['duitku'].type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }\`}>
                {messages['duitku'].type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <p className="text-sm font-medium">{messages['duitku'].text}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-400 tracking-wider">DUITKU MERCHANT CODE</label>
                <input 
                  type="text" 
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
                  placeholder="DSxxxxx"
                  value={duitkuMerchantCode} 
                  onChange={(e) => setDuitkuMerchantCode(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-400 tracking-wider">DUITKU ENVIRONMENT MODE</label>
                <select 
                  className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
                  value={duitkuEnv}
                  onChange={(e) => setDuitkuEnv(e.target.value as 'sandbox' | 'production')}
                >
                  <option value="sandbox">Sandbox / Testing (sandbox.duitku.com)</option>
                  <option value="production">Production / Live (passport.duitku.com)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-400 tracking-wider">DUITKU MERCHANT API KEY</label>
              <input 
                type="password" 
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50 font-mono tracking-widest"
                placeholder="••••••••••••••••••••••••••••••••"
                value={duitkuApiKey} 
                onChange={(e) => setDuitkuApiKey(e.target.value)}
              />
              <p className="text-[10px] text-stone-500">Kunci API rahasia untuk menghasilkan & memvalidasi MD5 signature pada request inquiry dan IPN webhook.</p>
            </div>`;

const replacementUI = `          <div className="space-y-4 mt-6">
            {messages['duitku'] && (
              <div className={\`p-4 rounded-xl flex items-center gap-3 \${
                messages['duitku'].type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
              }\`}>
                {messages['duitku'].type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                <p className="text-sm font-medium">{messages['duitku'].text}</p>
              </div>
            )}

            <div className="space-y-1.5 pb-4 border-b border-stone-800">
              <label className="text-xs font-bold text-stone-400 tracking-wider">ACTIVE ENVIRONMENT MODE</label>
              <select 
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
                value={duitkuEnv}
                onChange={(e) => setDuitkuEnv(e.target.value as 'sandbox' | 'production')}
              >
                <option value="sandbox">Sandbox / Testing (sandbox.duitku.com)</option>
                <option value="production">Production / Live (passport.duitku.com)</option>
              </select>
              <p className="text-[10px] text-stone-500">Mode yang dipilih akan digunakan untuk proses checkout pada aplikasi.</p>
            </div>

            {/* Sandbox Credentials */}
            <div className={\`space-y-4 p-4 rounded-xl border \${duitkuEnv === 'sandbox' ? 'bg-amber-500/5 border-amber-500/20' : 'bg-stone-950/50 border-stone-800/50'}\`}>
              <h4 className="text-sm font-bold text-stone-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                Kredensial Sandbox
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 tracking-wider">SANDBOX MERCHANT CODE</label>
                  <input 
                    type="text" 
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
                    placeholder="DSxxxxx"
                    value={duitkuSandboxMerchantCode} 
                    onChange={(e) => setDuitkuSandboxMerchantCode(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 tracking-wider">SANDBOX API KEY</label>
                  <input 
                    type="password" 
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50 font-mono tracking-widest"
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={duitkuSandboxApiKey} 
                    onChange={(e) => setDuitkuSandboxApiKey(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Production Credentials */}
            <div className={\`space-y-4 p-4 rounded-xl border \${duitkuEnv === 'production' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-stone-950/50 border-stone-800/50'}\`}>
              <h4 className="text-sm font-bold text-stone-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Kredensial Production
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 tracking-wider">PRODUCTION MERCHANT CODE</label>
                  <input 
                    type="text" 
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50"
                    placeholder="Dxxxxx"
                    value={duitkuProductionMerchantCode} 
                    onChange={(e) => setDuitkuProductionMerchantCode(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-500 tracking-wider">PRODUCTION API KEY</label>
                  <input 
                    type="password" 
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg px-4 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/50 font-mono tracking-widest"
                    placeholder="••••••••••••••••••••••••••••••••"
                    value={duitkuProductionApiKey} 
                    onChange={(e) => setDuitkuProductionApiKey(e.target.value)}
                  />
                </div>
              </div>
            </div>`;

content = content.replace(targetUI, replacementUI);
fs.writeFileSync('src/pages/admin/AdminSettings.tsx', content);
