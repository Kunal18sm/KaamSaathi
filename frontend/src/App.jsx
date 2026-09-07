import React, { useState } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import CustomerPortal from './pages/CustomerPortal';
import WorkerPortal from './pages/WorkerPortal';
import CooperativeAdminDashboard from './pages/CooperativeAdminDashboard';
import FederationMinistryDashboard from './pages/FederationMinistryDashboard';
import LandingPage from './pages/LandingPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import PWAInstallBanner from './components/PWAInstallBanner';
import { translations } from './i18n/translations';

function MainAppContent() {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState('en');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('CUSTOMER');

  const t = translations[lang] || translations.en;

  const handleOpenAuth = (mode = 'login', role = 'CUSTOMER') => {
    setAuthMode(mode);
    setAuthRole(role);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50/70 flex flex-col antialiased">
      {/* Slim Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img
              src="/logo.jpg"
              alt="SevaSetu Logo"
              className="w-8 h-8 rounded-xl object-cover shadow-sm"
            />
            <div>
              <div className="font-black text-slate-900 text-sm leading-tight tracking-tight">SevaSetu</div>
              <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider leading-none hidden sm:block">Cooperative Services</div>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* PWA Install */}
            <PWAInstallBanner variant="navbar" />

            {/* Language */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              className="hidden sm:block bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="hi">HI</option>
              <option value="bn">BN</option>
            </select>

            {/* User / Sign In */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-900 max-w-[120px] sm:max-w-[180px] truncate">
                  <User className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="truncate">{user.name}</span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg transition"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleOpenAuth('login', 'CUSTOMER')}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1.5 shadow-sm transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {!user ? (
          <LandingPage onOpenAuth={handleOpenAuth} t={t} />
        ) : user.role === 'WORKER' ? (
          <WorkerPortal t={t} />
        ) : user.role === 'COOPERATIVE' ? (
          <CooperativeAdminDashboard t={t} />
        ) : user.role === 'FEDERATION' ? (
          <FederationMinistryDashboard t={t} />
        ) : (
          <CustomerPortal t={t} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700">
            SevaSetu • Cooperative Gig Services Platform for Household & Community Services
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        initialMode={authMode}
        initialRole={authRole}
        t={t}
        lang={lang}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
