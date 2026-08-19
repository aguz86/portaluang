const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileView.tsx', 'utf8');

content = content.replace(
  /export const ProfileView: React.FC = \(\) => \{/,
  `interface ProfileViewProps {
  showToast: (msg: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ showToast }) => {`
);

content = content.replace(/150000/g, '29000');

content = content.replace(
  /<button className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-bold border border-stone-700 transition-colors">/g,
  '<button onClick={() => showToast("Fitur Edit Profil akan segera hadir!")} className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-bold border border-stone-700 transition-colors">'
);

content = content.replace(
  /<button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950\/30 hover:bg-rose-950\/50 text-rose-400 text-sm font-bold border border-rose-900\/50 transition-colors">/g,
  '<button onClick={() => { showToast("Berhasil Keluar (Simulasi)"); window.location.href = "/"; }} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 text-sm font-bold border border-rose-900/50 transition-colors">'
);

content = content.replace(
  /<button className="text-xs text-amber-400 font-semibold hover:underline">Unduh Invois<\/button>/g,
  '<button onClick={() => showToast("Mengunduh invois...")} className="text-xs text-amber-400 font-semibold hover:underline">Unduh Invois</button>'
);

content = content.replace(
  /<div key=\{i\} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex gap-3 hover:border-amber-500\/30 transition-colors cursor-pointer group">/g,
  '<div key={i} onClick={() => showToast(`Membuka pengaturan: ${feat.title}`)} className="bg-stone-950 border border-stone-800 rounded-xl p-4 flex gap-3 hover:border-amber-500/30 transition-colors cursor-pointer group">'
);

fs.writeFileSync('src/components/ProfileView.tsx', content);
