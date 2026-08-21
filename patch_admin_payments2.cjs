const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminPayments.tsx', 'utf8');

const targetState = `  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');`;

const replacementState = `  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterEnv, setFilterEnv] = useState<string>('ALL');`;

content = content.replace(targetState, replacementState);

const targetFilter = `    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });`;

const replacementFilter = `    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const envVal = (t as any).env || 'sandbox'; // Fallback to sandbox for old transactions
    const matchesEnv = filterEnv === 'ALL' || envVal === filterEnv;
    return matchesSearch && matchesStatus && matchesEnv;
  });`;

content = content.replace(targetFilter, replacementFilter);

const targetUI = `          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">Semua Status</option>
            <option value="SUCCESS">Lunas (Success)</option>
            <option value="PENDING">Tertunda (Pending)</option>
            <option value="FAILED">Gagal / Kadaluarsa</option>
          </select>
        </div>`;

const replacementUI = `          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">Semua Status</option>
            <option value="SUCCESS">Lunas (Success)</option>
            <option value="PENDING">Tertunda (Pending)</option>
            <option value="FAILED">Gagal / Kadaluarsa</option>
          </select>
          <select 
            value={filterEnv}
            onChange={(e) => setFilterEnv(e.target.value)}
            className="bg-stone-900 border border-stone-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-200 focus:outline-none focus:border-amber-500/50"
          >
            <option value="ALL">Semua Mode</option>
            <option value="sandbox">Sandbox (Testing)</option>
            <option value="production">Production (Live)</option>
          </select>
        </div>`;

content = content.replace(targetUI, replacementUI);

const targetBadge = `                      <div className="text-sm font-mono font-bold text-stone-200">{tx.merchantOrderId}</div>`;

const replacementBadge = `                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-sm font-mono font-bold text-stone-200">{tx.merchantOrderId}</div>
                        {(tx as any).env === 'production' ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold uppercase tracking-widest border border-emerald-500/30">Live</span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold uppercase tracking-widest border border-amber-500/30">Sandbox</span>
                        )}
                      </div>`;

content = content.replace(targetBadge, replacementBadge);

fs.writeFileSync('src/pages/admin/AdminPayments.tsx', content);
