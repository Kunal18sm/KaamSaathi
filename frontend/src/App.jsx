import React, { useState } from 'react';
import { LogIn, User, Globe, Home } from 'lucide-react';
import CustomerPortal from './pages/CustomerPortal';
import WorkerPortal from './pages/WorkerPortal';
import CooperativeAdminDashboard from './pages/CooperativeAdminDashboard';
import FederationMinistryDashboard from './pages/FederationMinistryDashboard';
import LandingPage from './pages/LandingPage';
import UserProfile from './pages/UserProfile';
import ServicesDirectory from './pages/ServicesDirectory';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import { translations } from './i18n/translations';

function MainAppContent() {
  const { user } = useAuth();
  const [lang, setLang] = useState('en');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('CUSTOMER');
  const [activeView, setActiveView] = useState('MAIN');

  const t = translations[lang] || translations.en;

  const handleOpenAuth = (mode = 'login', role = 'CUSTOMER') => {
    setAuthMode(mode);
    setAuthRole(role);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col antialiased text-slate-900">

      {/* ── Navbar ── */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

          {/* Logo + nav tabs */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveView('MAIN')}
              className="flex items-center gap-2.5 hover:opacity-80 transition text-left"
            >
              {/* KaamSathi logo: wrench icon inside rounded green square */}
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm shrink-0">
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                  <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/>
                </svg>
              </div>
              <div>
                <div className="font-black text-slate-900 text-sm leading-tight tracking-tight">KaamSathi</div>
                <div className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider leading-none hidden sm:block">Trusted local services</div>
              </div>
            </button>

            {user && (
              <div className="hidden sm:flex items-center gap-1 ml-4 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                <button
                  onClick={() => setActiveView('MAIN')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    activeView === 'MAIN' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  Home
                </button>
                <button
                  onClick={() => setActiveView('PROFILE')}
                  className={`px-3 py-1 rounded-lg transition flex items-center gap-1 ${
                    activeView === 'PROFILE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  Profile
                </button>
              </div>
            )}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1">
              <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value)}
                className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer py-0.5"
              >
                <option value="en">ENG</option>
                <option value="hi">HI</option>
                <option value="bn">BN</option>
              </select>
            </div>

            {user ? (
              <button
                onClick={() => setActiveView(activeView === 'PROFILE' ? 'MAIN' : 'PROFILE')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  activeView === 'PROFILE'
                    ? 'bg-emerald-600 text-white border-emerald-700'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${activeView === 'PROFILE' ? 'text-white' : 'text-emerald-600'}`} />
                <span className="truncate max-w-[100px] sm:max-w-[140px]">{user.name}</span>
              </button>
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

      {/* ── Main ── */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeView === 'PROFILE' && user ? (
          <UserProfile onBack={() => setActiveView('MAIN')} t={t} />
        ) : activeView === 'SERVICES' && user?.role === 'CUSTOMER' ? (
          <ServicesDirectory onBack={() => setActiveView('MAIN')} />
        ) : !user ? (
          <LandingPage onOpenAuth={handleOpenAuth} t={t} />
        ) : user.role === 'WORKER' ? (
          <WorkerPortal t={t} onOpenProfile={() => setActiveView('PROFILE')} />
        ) : user.role === 'COOPERATIVE' ? (
          <CooperativeAdminDashboard t={t} />
        ) : user.role === 'FEDERATION' ? (
          <FederationMinistryDashboard t={t} />
        ) : (
          <CustomerPortal t={t} onOpenProfile={() => setActiveView('PROFILE')} onBrowseServices={() => setActiveView('SERVICES')} />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-white border-t border-gray-200 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs text-gray-500">
          <p className="font-semibold text-gray-700">
            KaamSathi · Cooperative Gig Services Platform for Household & Community Services
          </p>
        </div>
      </footer>

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
