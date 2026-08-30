import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaWhatsapp, FaTiktok, FaThreads, FaInstagram, FaYoutube, FaFacebook } from 'react-icons/fa6';
import { ChevronDown, User, Settings, LogOut } from 'lucide-react';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { isSafeUrl } from '../utils/security';
import { checkIsAuthenticated, clearUserAuthSession } from '../utils/auth';
import { getUserProfile } from '../utils/subscription';

export const LandingLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const { settings } = useGlobalSettings();
  const [socials, setSocials] = useState<any>({});
  
  const [isAuth, setIsAuth] = useState(false);
  const [userName, setUserName] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const authStatus = checkIsAuthenticated();
    setIsAuth(authStatus);
    if (authStatus) {
      const profile = getUserProfile();
      if (profile && profile.name) {
        setUserName(profile.name);
      } else {
        setUserName('Pengguna');
      }
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearUserAuthSession();
    setIsAuth(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 font-sans selection:bg-amber-500 selection:text-stone-950 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-stone-800 bg-stone-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-lg shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
                {'PU'}</div>
              <span className="font-extrabold text-lg md:text-xl tracking-tight text-stone-100">{settings.appName}</span>
            </Link>
            
            <div className="hidden md:flex space-x-6">
              <Link to="/features" className="text-stone-300 hover:text-white transition-colors text-sm font-medium">Fitur</Link>
              <Link to="/pricing" className="text-stone-300 hover:text-white transition-colors text-sm font-medium">Harga</Link>
              <Link to="/blog" className="text-stone-300 hover:text-white transition-colors text-sm font-medium">Blog</Link>
              <Link to="/about" className="text-stone-300 hover:text-white transition-colors text-sm font-medium">Tentang Kami</Link>
              <Link to="/faq" className="text-stone-300 hover:text-white transition-colors text-sm font-medium">FAQ</Link>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuth ? (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-1.5 text-stone-300 hover:text-white transition-colors text-sm font-medium focus:outline-none"
                  >
                    <span className="truncate max-w-[120px] md:max-w-[150px]">Halo, {userName}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {showDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-stone-900 border border-stone-800 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                      <Link onClick={() => setShowDropdown(false)} to="/app/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-stone-300 hover:text-white hover:bg-stone-800 transition-colors rounded-t-xl">
                        <User className="w-4 h-4" /> Dashboard
                      </Link>
                      <Link onClick={() => setShowDropdown(false)} to="/app/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-stone-300 hover:text-white hover:bg-stone-800 transition-colors">
                        <Settings className="w-4 h-4" /> Pengaturan Akun
                      </Link>
                      <div className="h-px bg-stone-800 my-1"></div>
                      <button 
                        onClick={() => {
                          setShowDropdown(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-stone-800 transition-colors text-left rounded-b-xl"
                      >
                        <LogOut className="w-4 h-4" /> Keluar
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-stone-300 hover:text-white transition-colors text-sm font-medium">Masuk</Link>
                  <Link to="/register" className="bg-amber-500 hover:bg-amber-400 text-stone-950 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                    Coba 24 Jam
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 flex items-center justify-center font-bold text-xs">
                {'PU'}</div>
              <span className="font-extrabold text-base text-stone-100">{settings.appName}</span>
            </div>
            <p className="text-stone-400 text-sm">Personal Finance OS yang membantu Kamu mengelola uang dengan cerdas.</p>

            <div className="flex items-center gap-4 mt-6">
              {socials.whatsapp && isSafeUrl(socials.whatsapp) && (
                <a href={socials.whatsapp} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#25D366] transition-colors" aria-label="WhatsApp">
                  <FaWhatsapp className="w-5 h-5" />
                </a>
              )}
              {socials.tiktok && isSafeUrl(socials.tiktok) && (
                <a href={socials.tiktok} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-white transition-colors" aria-label="TikTok">
                  <FaTiktok className="w-5 h-5" />
                </a>
              )}
              {socials.threads && isSafeUrl(socials.threads) && (
                <a href={socials.threads} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-white transition-colors" aria-label="Threads">
                  <FaThreads className="w-5 h-5" />
                </a>
              )}
              {socials.instagram && isSafeUrl(socials.instagram) && (
                <a href={socials.instagram} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#E1306C] transition-colors" aria-label="Instagram">
                  <FaInstagram className="w-5 h-5" />
                </a>
              )}
              {socials.youtube && isSafeUrl(socials.youtube) && (
                <a href={socials.youtube} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#FF0000] transition-colors" aria-label="YouTube">
                  <FaYoutube className="w-5 h-5" />
                </a>
              )}
              {socials.facebook && isSafeUrl(socials.facebook) && (
                <a href={socials.facebook} target="_blank" rel="noopener noreferrer" className="text-stone-400 hover:text-[#1877F2] transition-colors" aria-label="Facebook">
                  <FaFacebook className="w-5 h-5" />
                </a>
              )}
            </div>

          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Produk</h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><Link to="/features" className="hover:text-amber-500 transition-colors">Fitur</Link></li>
              <li><Link to="/pricing" className="hover:text-amber-500 transition-colors">Harga</Link></li>
              <li><Link to="/landing/pro" className="hover:text-amber-500 transition-colors">Portal Uang Pro</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Perusahaan</h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><Link to="/about" className="hover:text-amber-500 transition-colors">Tentang Kami</Link></li>
              <li><Link to="/blog" className="hover:text-amber-500 transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-amber-500 transition-colors">Kontak</Link></li>
              <li><Link to="/faq" className="hover:text-amber-500 transition-colors">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-bold text-white mb-4">Legal</h3>
            <ul className="space-y-2 text-sm text-stone-400">
              <li><Link to="/legal/privacy" className="hover:text-amber-500 transition-colors">Kebijakan Privasi</Link></li>
              <li><Link to="/legal/terms" className="hover:text-amber-500 transition-colors">Syarat & Ketentuan</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-8 border-t border-stone-800 text-center text-sm text-stone-500">
          &copy; {new Date().getFullYear()} {settings.appName}. Hak Cipta Dilindungi.
          <span className="ml-2 px-2 py-0.5 rounded-full bg-stone-900 border border-stone-800 text-[10px]">v{settings.appVersion}</span>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {socials.whatsapp && (
        <a 
          href={socials.whatsapp} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg shadow-[#25D366]/20 hover:scale-110 hover:shadow-xl hover:shadow-[#25D366]/40 hover:bg-[#20bd5a] transition-all flex items-center justify-center group"
          aria-label="WhatsApp Admin"
        >
          <FaWhatsapp className="w-6 h-6" />
          <span className="absolute right-full mr-4 bg-stone-800 text-white text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none border border-stone-700 shadow-lg hidden md:block">
            Hubungi Admin
          </span>
        </a>
      )}
    </div>
  );
};
