import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  ExternalLink,
  Copy,
  Check,
  X,
  FileCode,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface ApkExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApkExportModal: React.FC<ApkExportModalProps> = ({ isOpen, onClose }) => {
  const { install, isInstallable } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Live hosted URL
  const appUrl =
    typeof window !== 'undefined' && window.location.origin && window.location.origin !== 'null'
      ? window.location.origin
      : 'https://ais-dev-ysioqyksysy2x672sips2d-79227567953.asia-east1.run.app';

  // 1-Click PWABuilder Android APK generator link
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(
    appUrl
  )}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Get Android App / APK
              </h2>
              <p className="text-xs text-slate-400">
                Install directly on your phone or generate a standalone APK package
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Method 1: Instant Native Android Installation (WebAPK) */}
          <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border-2 border-emerald-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 uppercase tracking-wide">
                  Method 1 (Recommended)
                </span>
              </div>
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Instant & No Warnings</span>
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                Direct Android Install (WebAPK)
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                When opened on any Android phone (Chrome, Samsung Internet, Edge), Android builds and installs an official APK directly into your phone’s app drawer. No untrusted APK warnings or file downloads needed!
              </p>
            </div>

            {isInstallable ? (
              <button
                onClick={() => {
                  install();
                  onClose();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install on this Android Device Now</span>
              </button>
            ) : (
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 space-y-1">
                <p className="font-semibold text-white">How to install on your mobile phone:</p>
                <p>1. Open this app's URL in <strong>Google Chrome</strong> on your Android phone.</p>
                <p>2. Tap the <strong>"Install App"</strong> button or Chrome menu (⋮) ➔ <strong>"Install App"</strong>.</p>
                <p>3. It will install right onto your home screen with its own Prabhat icon!</p>
              </div>
            )}
          </div>

          {/* Method 2: 1-Click Generate Signed APK via PWABuilder */}
          <div className="p-4 rounded-3xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 uppercase tracking-wide">
                Method 2
              </span>
              <span className="text-[11px] text-slate-400">Download .apk file</span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">
                Download Standalone .APK File (PWABuilder)
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Want a real downloadable <strong>.apk</strong> file to share on WhatsApp or sideload? This app's manifest is 100% Google Play ready. Tap below to generate and download the signed APK:
              </p>
            </div>

            <a
              href={pwaBuilderUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer text-center"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Generate & Download APK on PWABuilder</span>
            </a>

            <p className="text-[11px] text-slate-400 text-center">
              Opens PWABuilder with your app's prefilled URL ➔ Click <strong>"Package for Android"</strong> to get the APK.
            </p>
          </div>

          {/* Share / Open on Phone URL */}
          <div className="p-4 rounded-3xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">App URL to Open on Phone:</span>
              <button
                onClick={() => setShowQr(!showQr)}
                className="text-xs text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showQr ? 'Hide QR' : 'Show QR Code'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono select-all truncate"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shrink-0 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* QR Code generator using quick API for instant mobile scanning */}
            {showQr && (
              <div className="pt-2 text-center space-y-2 animate-in fade-in">
                <div className="p-3 bg-white rounded-2xl w-44 h-44 mx-auto flex items-center justify-center shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      appUrl
                    )}`}
                    alt="Scan to open on phone"
                    className="w-40 h-40"
                  />
                </div>
                <p className="text-[11px] text-slate-400">
                  Scan with your phone camera to open and install instantly
                </p>
              </div>
            )}
          </div>

          {/* Developer / Capacitor Build Option */}
          <div className="p-4 rounded-2xl bg-slate-950/40 border border-slate-800/80 space-y-2 text-xs text-slate-400">
            <p className="font-semibold text-slate-300 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-sky-400" />
              <span>Developer Option (Capacitor / Android Studio):</span>
            </p>
            <p>
              A <code>capacitor.config.json</code> has been configured for this project. If building via terminal:
            </p>
            <div className="p-2.5 rounded-xl bg-slate-900 font-mono text-[11px] text-sky-300 space-y-1 overflow-x-auto">
              <div>npm install @capacitor/core @capacitor/cli @capacitor/android</div>
              <div>npx cap add android</div>
              <div>npx cap build android</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
