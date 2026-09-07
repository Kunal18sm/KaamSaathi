import React, { useState, useEffect } from 'react';
import { Download, Smartphone, CheckCircle, X, Share } from 'lucide-react';

export default function PWAInstallBanner({ variant = 'banner' }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Check if app is running in standalone PWA mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    setIsStandalone(isStandaloneMode);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
      setIsStandalone(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        console.log('[SevaSetu PWA] User accepted PWA install prompt');
        setInstalledSuccess(true);
      }
      setDeferredPrompt(null);
    } else {
      // Check if iOS Safari
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      if (isIOS) {
        setShowIOSModal(true);
      } else {
        // Fallback for Chrome/Edge/Firefox if prompt wasn't captured yet
        alert('To install SevaSetu on your device, tap the Menu icon (⋮ or ...) in your browser and select "Install App" or "Add to Home Screen".');
      }
    }
  };

  // If already running in installed standalone app mode, don't show prompt
  if (isStandalone && !installedSuccess) {
    return null;
  }

  // Variant 1: Navbar Button (Compact icon-only)
  if (variant === 'navbar') {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg transition shrink-0"
          title="Install SevaSetu app on your phone"
        >
          <Download className="w-3.5 h-3.5" />
        </button>

        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} />
        )}
      </>
    );
  }

  // Variant 2: Hero / Starting Section Prominent Banner
  return (
    <>
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-emerald-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden my-4">
        {/* Background glow */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 bg-emerald-600/30 border border-emerald-400/40 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <Smartphone className="w-7 h-7 text-emerald-300 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Full App Experience
              </span>
              <span className="text-xs text-emerald-300 font-bold">&bull; Offline Support & Instant Push Alerts</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">
              Install SevaSetu Mobile App
            </h3>
            <p className="text-xs text-emerald-100/90 mt-0.5 max-w-xl">
              Install SevaSetu directly to your phone home screen for 1-tap dispatches, real-time vibration alarms, and full native mobile app performance.
            </p>
          </div>
        </div>

        <div className="z-10 w-full md:w-auto flex items-center gap-3">
          <button
            onClick={handleInstallClick}
            className="w-full md:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 transition hover:scale-105"
          >
            <Download className="w-4 h-4 stroke-[3]" />
            <span>Install App on Phone</span>
          </button>
        </div>
      </div>

      {showIOSModal && (
        <IOSInstallModal onClose={() => setShowIOSModal(false)} />
      )}
    </>
  );
}

function IOSInstallModal({ onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative border border-gray-100">
        <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 text-gray-500">
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
          <Share className="w-6 h-6" />
        </div>

        <h3 className="font-extrabold text-gray-900 text-lg">Install on iPhone / iPad</h3>
        <p className="text-xs text-gray-600 leading-relaxed">
          To install SevaSetu on iOS Safari:
        </p>
        <ol className="text-xs text-left text-gray-700 space-y-2 bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
          <li className="flex items-center gap-2 font-medium">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">1</span>
            Tap the <strong>Share</strong> button at the bottom of Safari.
          </li>
          <li className="flex items-center gap-2 font-medium">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">2</span>
            Scroll down and select <strong>Add to Home Screen</strong>.
          </li>
          <li className="flex items-center gap-2 font-medium">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">3</span>
            Tap <strong>Add</strong> at top right to launch full app.
          </li>
        </ol>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
