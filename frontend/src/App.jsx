import React, { useState } from 'react';
import { LogIn, User, Globe, Home } from 'lucide-react';
import CustomerPortal from './pages/CustomerPortal';
import WorkerPortal from './pages/WorkerPortal';
import CooperativeAdminDashboard from './pages/CooperativeAdminDashboard';
import FederationMinistryDashboard from './pages/FederationMinistryDashboard';
import LandingPage from './pages/LandingPage';
import UserProfile from './pages/UserProfile';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import { translations } from './i18n/translations';

function MainAppContent() {
  const { user, logout } = useAuth();
  const [lang, setLang] = useState('en');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authRole, setAuthRole] = useState('CUSTOMER');
  const [activeView, setActiveView] = useState('MAIN'); // 'MAIN' or 'PROFILE'

  const t = translations[lang] || translations.en;

  const handleOpenAuth = (mode = 'login', role = 'CUSTOMER') => {
    setAuthMode(mode);
    setAuthRole(role);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#f8faf9] flex flex-col antialiased text-slate-900">
      {/* Slim Top Navigation Bar */}
      <header className="bg-white/90 backdrop-blur border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          
          {/* Brand Logo & View Switcher */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveView('MAIN')}
              className="flex items-center gap-2.5 hover:opacity-80 transition text-left"
            >
              <img
                src="/logo.jpg"
                alt="SevaSetu Logo"
                className="w-8 h-8 rounded-xl object-cover shadow-sm"
              />
              <div>
                <div className="font-black text-slate-900 text-sm leading-tight tracking-tight">SevaSetu</div>
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

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-2 py-1 focus-within:ring-2 focus-within:ring-emerald-500">
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

            {/* User Profile Button */}
            {user ? (
              <button
                onClick={() => setActiveView(activeView === 'PROFILE' ? 'MAIN' : 'PROFILE')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  activeView === 'PROFILE'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                    : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 shadow-2xs'
                }`}
                title="My Profile"
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

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeView === 'PROFILE' && user ? (
          <UserProfile onBack={() => setActiveView('MAIN')} t={t} />
        ) : !user ? (
          <LandingPage onOpenAuth={handleOpenAuth} t={t} />
        ) : user.role === 'WORKER' ? (
          <WorkerPortal t={t} onOpenProfile={() => setActiveView('PROFILE')} />
        ) : user.role === 'COOPERATIVE' ? (
          <CooperativeAdminDashboard t={t} />
        ) : user.role === 'FEDERATION' ? (
          <FederationMinistryDashboard t={t} />
        ) : (
          <CustomerPortal t={t} onOpenProfile={() => setActiveView('PROFILE')} />
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
