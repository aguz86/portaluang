const fs = require('fs');

let code = fs.readFileSync('src/components/ZeroBasedBudgetView.tsx', 'utf8');

code = code.replace(
  `import { getDriveToken, uploadToDrive } from "../utils/googleDrive";`,
  `import { getDriveToken, uploadToDrive, listBackupFiles, downloadFromDrive } from "../utils/googleDrive";`
);

code = code.replace(
  `const [pendingAction, setPendingAction] = useState<'print_pdf' | 'backup_local' | 'backup_drive' | 'import_local' | null>(null);`,
  `const [pendingAction, setPendingAction] = useState<'print_pdf' | 'backup_local' | 'backup_drive' | 'restore_drive' | 'import_local' | null>(null);`
);

code = code.replace(
  `const handleDataAction = (action: 'print_pdf' | 'backup_local' | 'backup_drive' | 'import_local') => {`,
  `const handleDataAction = (action: 'print_pdf' | 'backup_local' | 'backup_drive' | 'restore_drive' | 'import_local') => {`
);

code = code.replace(
  `if (action === 'import_local' && !hasPin) {`,
  `if ((action === 'import_local' || action === 'restore_drive') && !hasPin) {`
);

code = code.replace(
  `alert('Gagal backup ke Google Drive. Pastikan Anda memberikan izin akses.');
      }
    } else if (pendingAction === 'import_local') {`,
  `alert('Gagal backup ke Google Drive. Pastikan Anda memberikan izin akses.');
      }
    } else if (pendingAction === 'restore_drive') {
      try {
        const token = await getDriveToken();
        const files = await listBackupFiles(token);
        if (files.length === 0) {
          alert('Tidak ditemukan file backup "PortalUang_Backup" di Google Drive Anda.');
          return;
        }
        
        // Ambil file backup terbaru (indeks 0 karena desc)
        const latestFile = files[0];
        if (!confirm(\`Ditemukan backup terbaru: \${latestFile.name}. Lanjutkan restore?\`)) {
           return;
        }
        
        const fileContent = await downloadFromDrive(token, latestFile.id);
        const decrypted = decryptData(fileContent, pin);
        
        if (decrypted && decrypted.budgetCategories && decrypted.transactions) {
          localStorage.setItem('portal_uang_budget_categories', JSON.stringify(decrypted.budgetCategories));
          localStorage.setItem('portal_uang_transactions', JSON.stringify(decrypted.transactions));
          window.location.reload();
        } else {
          alert('PIN salah atau format file rusak.');
        }
      } catch (err: any) {
        console.error(err);
        alert('Gagal melakukan restore dari Google Drive.');
      }
    } else if (pendingAction === 'import_local') {`
);

fs.writeFileSync('src/components/ZeroBasedBudgetView.tsx', code);
