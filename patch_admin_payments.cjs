const fs = require('fs');
let content = fs.readFileSync('src/pages/admin/AdminPayments.tsx', 'utf8');

const target1 = `  const handleSimulatePayment = async (merchantOrderId: string) => {
    setActionLoading(merchantOrderId);
    try {
      const res = await fetch('/api/payment/duitku/simulate-sandbox-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantOrderId })
      });
      const data = await res.json();
      if (data.success) {
        await fetchTransactions();
      }
    } catch (err) {
      console.error('Simulation failed', err);
    } finally {
      setActionLoading(null);
    }
  };`;

const replacement1 = `  const handleCheckStatus = async (merchantOrderId: string) => {
    setActionLoading(merchantOrderId);
    try {
      const res = await fetch(\`/api/payment/duitku/check-status/\${merchantOrderId}\`);
      const data = await res.json();
      if (data.success) {
        if (data.isPaid) {
          alert('Pembayaran telah lunas!');
        } else {
          alert('Pembayaran belum lunas atau masih tertunda.');
        }
        await fetchTransactions();
      }
    } catch (err) {
      console.error('Check status failed', err);
    } finally {
      setActionLoading(null);
    }
  };`;

content = content.replace(target1, replacement1);

const target2 = `                      {tx.status === 'PENDING' && (
                        <button
                          onClick={() => handleSimulatePayment(tx.merchantOrderId)}
                          disabled={actionLoading === tx.merchantOrderId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold transition-colors"
                          title="Simulasikan Webhook Lunas Duitku"
                        >
                          <Play className="w-3 h-3" />
                          {actionLoading === tx.merchantOrderId ? 'Memproses...' : 'Simulasi Bayar'}
                        </button>
                      )}`;

const replacement2 = `                      {tx.status === 'PENDING' && (
                        <button
                          onClick={() => handleCheckStatus(tx.merchantOrderId)}
                          disabled={actionLoading === tx.merchantOrderId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold transition-colors"
                          title="Cek Status Pembayaran ke Duitku"
                        >
                          <RefreshCw className="w-3 h-3" />
                          {actionLoading === tx.merchantOrderId ? 'Mengecek...' : 'Cek Status'}
                        </button>
                      )}`;

content = content.replace(target2, replacement2);
fs.writeFileSync('src/pages/admin/AdminPayments.tsx', content);
