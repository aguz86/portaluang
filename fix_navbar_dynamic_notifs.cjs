const fs = require('fs');
let content = fs.readFileSync('src/components/Navbar.tsx', 'utf8');

// Replace the notifications array with a useMemo
const dynamicNotificationsCode = `
  const notifications = React.useMemo(() => {
    const notifs = [];
    const today = new Date();
    const reminderDays = notificationSettings?.dueReminderDays || 3;
    let notifId = 1;

    // 1. Cek Tagihan (Bills)
    bills.forEach(bill => {
      if (bill.isPaid) return;
      
      // Hitung tanggal jatuh tempo bulan ini
      const due = new Date(today.getFullYear(), today.getMonth(), bill.dueDate);
      const diffTime = due.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= reminderDays && diffDays >= 0) {
        notifs.push({
          id: notifId++,
          title: diffDays === 0 ? 'Jatuh Tempo Hari Ini' : 'Waktunya Bayar',
          desc: \`Tagihan \${bill.name} sebesar Rp \${bill.amount.toLocaleString('id-ID')} jatuh tempo \${diffDays === 0 ? 'hari ini' : \`dalam \${diffDays} hari\`}.\`,
          type: diffDays === 0 ? 'danger' : 'warning',
          icon: diffDays === 0 ? <AlertTriangle className="w-4 h-4 text-rose-400" /> : <Calendar className="w-4 h-4 text-amber-400" />,
          time: 'Baru saja'
        });
      } else if (diffDays < 0 && diffDays > -30) {
        notifs.push({
          id: notifId++,
          title: 'Tagihan Terlewat',
          desc: \`Tagihan \${bill.name} telah melewati batas waktu.\`,
          type: 'danger',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          time: 'Lewat'
        });
      }
    });

    // 2. Cek Anggaran Berlebih (Overbudget)
    budgetCategories.forEach(cat => {
      const spent = transactions
        .filter(t => t.categoryId === cat.id && t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      if (spent > cat.amount && cat.amount > 0) {
        notifs.push({
          id: notifId++,
          title: 'Anggaran Berlebih',
          desc: \`Kategori \${cat.name} melebihi batas (\${Math.round((spent/cat.amount)*100)}%).\`,
          type: 'danger',
          icon: <AlertTriangle className="w-4 h-4 text-rose-400" />,
          time: 'Baru saja'
        });
      }
    });

    // 3. Mock Langganan (karena tidak ada di data, kita munculkan sesuai preferensi hari)
    if (reminderDays >= 3) {
      notifs.push({
        id: notifId++,
        title: 'Perpanjang Langganan',
        desc: \`Waktunya perpanjang langganan Premium Pro dalam \${reminderDays} hari.\`,
        type: 'info',
        icon: <Info className="w-4 h-4 text-blue-400" />,
        time: 'Baru saja'
      });
    }

    return notifs;
  }, [bills, transactions, budgetCategories, notificationSettings]);
`;

content = content.replace(
  /const notifications = \[[\s\S]*?\];/,
  dynamicNotificationsCode
);

// We also need to update the unread count text
content = content.replace(
  /4 Baru/,
  '{notifications.length} Baru'
);

fs.writeFileSync('src/components/Navbar.tsx', content);
