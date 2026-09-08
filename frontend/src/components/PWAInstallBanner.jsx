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

  // Variant 2: Simple Clean Banner
  return (
    <>
      <div className="bg-white border border-emerald-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3 my-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center justify-center shrink-0">
            <Smartphone className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              Install KaamSathi App
            </h3>
            <p className="text-[11px] text-slate-500 font-medium mt-0.5">
              Get instant alerts & offline access
            </p>
          </div>
        </div>

        <button
          onClick={handleInstallClick}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center justify-center gap-2 transition"
        >
          <Download className="w-4 h-4" />
          <span>Install App</span>
        </button>
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
