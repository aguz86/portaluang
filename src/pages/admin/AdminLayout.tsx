import React, { useState, useEffect } from 'react';
import { Link, useLocation, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { FaWhatsapp, FaTiktok, FaThreads, FaInstagram, FaYoutube, FaFacebook } from 'react-icons/fa6';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { FileEdit, LayoutDashboard, FileText, HelpCircle, 
  Users, 
  ReceiptText, 
  CreditCard, 
  Settings, ShieldCheck, 
  Download,
  LogOut,
  Send,
  PackageSearch,
  Megaphone,
  Bot
} from 'lucide-react';

const ADMIN_NAV = [
  { path: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { path: '/admin/ai-settings', label: 'Nama & Karakter AI', icon: <Bot className="w-5 h-5" /> },
  { path: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { path: '/admin/transactions', label: 'Transactions', icon: <ReceiptText className="w-5 h-5" /> },
  { path: '/admin/subscriptions', label: 'Subscriptions', icon: <PackageSearch className="w-5 h-5" /> },
  { path: '/admin/payments', label: 'Payments', icon: <CreditCard className="w-5 h-5" /> },
  { path: '/admin/telegram', label: 'Telegram Bot', icon: <Send className="w-5 h-5" /> },
  { path: '/admin/marketing', label: 'Marketing', icon: <Megaphone className="w-5 h-5" /> },
  { path: '/admin/posts', label: 'Artikel Blog', icon: <FileText className="w-5 h-5" /> },
  { path: '/admin/faqs', label: 'Manajemen FAQ', icon: <HelpCircle className="w-5 h-5" /> },
  { path: '/admin/content', label: 'Halaman Statis', icon: <FileEdit className="w-5 h-5" /> },
  { path: '/admin/security', label: 'Security', icon: <ShieldCheck className="w-5 h-5" /> },
  { path: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
  { path: '/admin/install', label: 'Installer', icon: <Download className="w-5 h-5" /> },
];

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useGlobalSettings();
  const [socials, setSocials] = useState<any>({});
  
  useEffect(() => {
    fetch('/api/public-settings')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.socials) {
          setSocials(data.socials);
        }
      })
      .catch(console.error);
  }, []);

  // Basic auth check
  if (!localStorage.getItem('admin_token')) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex font-sans selection:bg-rose-500 selection:text-stone-950">
      {/* Sidebar */}
      <div className="w-64 bg-stone-900 border-r border-stone-800 flex flex-col shrink-0 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-stone-800">
          <div className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-rose-500 text-stone-950 flex items-center justify-center font-bold text-sm shadow-lg shadow-rose-500/20">
              {'PU'}</div>
            <span className="font-extrabold text-lg tracking-tight text-stone-100">
              Admin<span className="text-rose-500">Panel</span>
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
          {ADMIN_NAV.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                location.pathname === item.path
                  ? 'bg-rose-500 text-stone-950 font-bold shadow-md shadow-rose-500/20'
                  : 'text-stone-400 hover:bg-stone-850 hover:text-stone-200 font-medium'
              }`}
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-stone-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-stone-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors font-medium text-sm"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile Header */}
        <header className="h-16 border-b border-stone-800 bg-stone-900 flex items-center px-4 md:hidden">
           <span className="font-extrabold text-lg tracking-tight text-stone-100">
              Admin<span className="text-rose-500">Panel</span>
            </span>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto bg-stone-950 p-4 md:p-8 custom-scrollbar">
          <div className="max-w-6xl mx-auto min-h-[calc(100vh-8rem)]">
            <Outlet />
          </div>
          {/* Admin Footer */}
          <footer className="mt-8 border-t border-stone-800/80 bg-stone-900/30 py-6 text-center text-xs text-stone-500 rounded-xl">
            <div className="max-w-6xl mx-auto px-4 flex flex-col items-center gap-4">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                <div>
                  <span className="font-bold text-stone-400">{settings.appName} Admin</span> • System Management
                </div>
                <div className="flex items-center gap-4">
                  {socials.whatsapp && (
                    <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#25D366] transition-colors" aria-label="WhatsApp">
                      <FaWhatsapp className="w-4 h-4" />
                    </a>
                  )}
                  {socials.tiktok && (
                    <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-white transition-colors" aria-label="TikTok">
                      <FaTiktok className="w-4 h-4" />
                    </a>
                  )}
                  {socials.threads && (
                    <a href={socials.threads} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-white transition-colors" aria-label="Threads">
                      <FaThreads className="w-4 h-4" />
                    </a>
                  )}
                  {socials.instagram && (
                    <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                      <FaInstagram className="w-4 h-4" />
                    </a>
                  )}
                  {socials.youtube && (
                    <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#FF0000] transition-colors" aria-label="YouTube">
                      <FaYoutube className="w-4 h-4" />
                    </a>
                  )}
                  {socials.facebook && (
                    <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#1877F2] transition-colors" aria-label="Facebook">
                      <FaFacebook className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
              <div className="w-full h-px bg-stone-800/50"></div>
              <div className="w-full flex justify-between items-center text-stone-600">
                <span>&copy; {new Date().getFullYear()} {settings.appName}.</span>
                <span>Version {settings.appVersion}</span>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};
