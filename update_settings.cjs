const fs = require('fs');
let content = fs.readFileSync('src/components/SettingsView.tsx', 'utf8');

const newSection = `
      {/* Reminder Config */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-sm mt-6">
        <h3 className="font-bold text-stone-100 flex items-center gap-2 mb-4">
          <BellRing className="w-5 h-5 text-amber-500" />
          Pengaturan Waktu Pengingat
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 block">
              Notifikasi H- Berapa (Hari)
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={localSettings.dueReminderDays}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, dueReminderDays: parseInt(e.target.value) || 3 }))}
              className="w-full bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-200 focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-stone-500 mt-1">Notifikasi akan muncul jika tagihan atau langganan mendekati jumlah hari ini dari tanggal jatuh tempo.</p>
          </div>
        </div>
      </div>
      
      {/* Information text about how it works */}`;

content = content.replace(
  /\{\/\* Information text about how it works \*\/\}/,
  newSection
);

content = content.replace(
  /kurang dari 3 hari/,
  `kurang dari atau sama dengan {localSettings.dueReminderDays} hari`
);

fs.writeFileSync('src/components/SettingsView.tsx', content);
