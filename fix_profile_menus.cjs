const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

// Add useNavigate import
if (!content.includes('useNavigate')) {
  content = content.replace(
    /import \{ User, Mail, Briefcase, Star, Clock, CreditCard, Shield, Bell, Key, LogOut, Sparkles \} from 'lucide-react';/,
    "import { User, Mail, Briefcase, Star, Clock, CreditCard, Shield, Bell, Key, LogOut, Sparkles } from 'lucide-react';\nimport { useNavigate } from 'react-router-dom';"
  );
}

// Add const navigate = useNavigate(); inside component
if (!content.includes('const navigate = useNavigate();')) {
  content = content.replace(
    /export const ProfileView: React.FC<ProfileViewProps> = \(\{ showToast \}\) => \{/,
    "export const ProfileView: React.FC<ProfileViewProps> = ({ showToast }) => {\n  const navigate = useNavigate();"
  );
}

// Update suggestedFeatures array
content = content.replace(
  /const suggestedFeatures = \[\s*\{[\s\S]*?\}\s*\];/,
  `const suggestedFeatures = [
    { icon: <Shield className="w-5 h-5 text-emerald-400" />, title: "Autentikasi Dua Faktor (2FA)", desc: "Tingkatkan keamanan akun dengan verifikasi dua langkah menggunakan aplikasi authenticator.", action: () => showToast("Fitur 2FA akan segera hadir!") },
    { icon: <Bell className="w-5 h-5 text-amber-400" />, title: "Preferensi Notifikasi", desc: "Atur pemberitahuan untuk tagihan jatuh tempo, pencapaian target tabungan, dan peringatan overbudget.", action: () => navigate('/app/settings') },
    { icon: <Key className="w-5 h-5 text-blue-400" />, title: "Manajemen Kredensial API", desc: "Kelola kunci akses API jika Anda ingin menghubungkan AuraLedger dengan layanan pihak ketiga atau bot Telegram Anda.", action: () => showToast("Fitur Kredensial API akan segera hadir!") },
    { icon: <CreditCard className="w-5 h-5 text-purple-400" />, title: "Manajemen Metode Pembayaran", desc: "Perbarui informasi kartu kredit atau e-wallet untuk pembayaran otomatis langganan Premium.", action: () => navigate('/app/billing/checkout') }
  ];`
);

// Update map
content = content.replace(
  /<div key=\{i\} onClick=\{\(\) => showToast\(\`Membuka pengaturan: \$\{feat.title\}\`\)\} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex gap-3 hover:border-amber-500\/30 transition-colors cursor-pointer group">/,
  '<div key={i} onClick={feat.action} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex gap-3 hover:border-amber-500/30 transition-colors cursor-pointer group">'
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
