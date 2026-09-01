const fs = require('fs');

let code = fs.readFileSync('src/components/DataManagementModal.tsx', 'utf8');

code = code.replace(
  `onAction: (action: 'print_pdf' | 'backup_local' | 'backup_drive' | 'import_local') => void;`,
  `onAction: (action: 'print_pdf' | 'backup_local' | 'backup_drive' | 'restore_drive' | 'import_local') => void;`
);

code = code.replace(
  `<button
              onClick={() => onAction('import_local')}`,
  `<button
              onClick={() => onAction('restore_drive')}
              className="flex items-center gap-4 p-4 rounded-xl border border-stone-800 bg-stone-950 hover:bg-stone-800 hover:border-emerald-500/50 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-stone-900 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-stone-200 text-sm">Restore dari GDrive</h3>
                <p className="text-xs text-stone-500 mt-0.5">Pulihkan backup dari Google Drive</p>
              </div>
            </button>
            <button
              onClick={() => onAction('import_local')}`
);

fs.writeFileSync('src/components/DataManagementModal.tsx', code);
