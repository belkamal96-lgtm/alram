import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Bell,
  Camera,
  Volume2,
  Moon,
  Sun,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  grantAllPermissions,
  getPermissionsStatus,
  PermissionsState,
  startBackgroundAudioKeepAlive,
  stopBackgroundAudioKeepAlive,
  enableScreenWakeLock,
  releaseScreenWakeLock,
} from '../utils/backgroundAlarmManager';

interface PermissionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionsModal: React.FC<PermissionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<PermissionsState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'all' | 'android' | 'ios'>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
    }
  }, [isOpen]);

  const refreshStatus = async () => {
    const s = await getPermissionsStatus();
    setStatus(s);
  };

  const handleGrantAll = async () => {
    setIsProcessing(true);
    setSuccessMessage(null);
    try {
      const results = await grantAllPermissions();
      await refreshStatus();
      if (results.notifications && results.camera) {
        setSuccessMessage('All permissions granted! Alarms will ring reliably in the background.');
      } else {
        setSuccessMessage('Permissions updated! Background audio and alert channels are active.');
      }
    } catch (err) {
      console.error('Permission setup error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleKeepAlive = () => {
    if (status?.backgroundKeepAliveActive) {
      stopBackgroundAudioKeepAlive();
    } else {
      startBackgroundAudioKeepAlive();
    }
    refreshStatus();
  };

  const handleToggleWakeLock = async () => {
    if (status?.wakeLockActive) {
      await releaseScreenWakeLock();
    } else {
      await enableScreenWakeLock();
    }
    refreshStatus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Mobile Permissions & Background Ringing
              </h2>
              <p className="text-xs text-slate-400">
                Ensure alarms ring even when your phone is locked or app is closed
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Main One-Tap Grant Button */}
          <div className="rounded-3xl bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-2 border-amber-500/40 p-5 shadow-lg space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-bold shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  1-Tap Permission & Background Setup
                </h3>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Grants notification alerts, unlocks continuous mobile audio playback, prepares the wake-up camera, and prevents missing alarms.
                </p>
              </div>
            </div>

            <button
              onClick={handleGrantAll}
              disabled={isProcessing}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-xl shadow-amber-500/20 transition transform active:scale-98 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
              <span>{isProcessing ? 'Configuring Permissions...' : 'Grant All Permissions & Enable Ringing'}</span>
            </button>

            {successMessage && (
              <p className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </p>
            )}
          </div>

          {/* Permissions Checklist Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              System Permissions Status
            </h4>

            <div className="space-y-2">
              {/* Notifications */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">System Notifications</p>
                    <p className="text-[11px] text-slate-400">Rings & vibrates with screen off</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {status?.notifications === 'granted' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Allowed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Needed</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Camera for Selfie Challenge */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Camera Access</p>
                    <p className="text-[11px] text-slate-400">Pre-approved for wake-up photo verification</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {status?.camera === 'granted' ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-xs font-semibold">
                      <span>Ready on Snap</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Audio Autoplay System */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Background Audio Session</p>
                    <p className="text-[11px] text-slate-400">Keeps audio hardware active in background</p>
                  </div>
                </div>

                <button
                  onClick={handleToggleKeepAlive}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    status?.backgroundKeepAliveActive
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {status?.backgroundKeepAliveActive ? 'Active ✓' : 'Enable'}
                </button>
              </div>

              {/* Screen Wake Lock (Nightstand) */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">Nightstand Screen Stay-Awake</p>
                    <p className="text-[11px] text-slate-400">Keeps screen dimly lit on bedside table</p>
                  </div>
                </div>

                <button
                  onClick={handleToggleWakeLock}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    status?.wakeLockActive
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {status?.wakeLockActive ? 'On ✓' : 'Off'}
                </button>
              </div>
            </div>
          </div>

          {/* Device-Specific Tips for 100% Reliable Ringing */}
          <div className="rounded-2xl bg-slate-950 p-4 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-sky-400" />
                <span>Device Compatibility Guide</span>
              </span>

              <div className="flex items-center gap-1 text-[11px]">
                <button
                  onClick={() => setActiveGuideTab('all')}
                  className={`px-2 py-0.5 rounded-lg transition ${
                    activeGuideTab === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  General
                </button>
                <button
                  onClick={() => setActiveGuideTab('android')}
                  className={`px-2 py-0.5 rounded-lg transition ${
                    activeGuideTab === 'android' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  Android
                </button>
                <button
                  onClick={() => setActiveGuideTab('ios')}
                  className={`px-2 py-0.5 rounded-lg transition ${
                    activeGuideTab === 'ios' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400'
                  }`}
                >
                  iPhone
                </button>
              </div>
            </div>

            {activeGuideTab === 'all' && (
              <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p>
                  • <strong>Web Worker Ticker:</strong> Prabhat uses an independent background Web Worker thread that avoids phone timer throttling.
                </p>
                <p>
                  • <strong>Audio Keep-Alive:</strong> Enabling Background Audio keeps the phone's sound hardware awake so the alarm song rings without delay.
                </p>
                <p>
                  • <strong>Lockscreen Support:</strong> Wake-up challenge and photo upload buttons appear directly on your lock screen!
                </p>
              </div>
            )}

            {activeGuideTab === 'android' && (
              <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p>
                  • <strong>Install App:</strong> Tap the "Install App" button in the header so Prabhat runs as a standalone app with system priority.
                </p>
                <p>
                  • <strong>Allow Notifications:</strong> Ensure notifications are set to "Allowed / Priority" in Chrome or app settings.
                </p>
                <p>
                  • <strong>Battery Saver:</strong> For critical alarms, set app battery usage to "Unrestricted" in Android Settings.
                </p>
              </div>
            )}

            {activeGuideTab === 'ios' && (
              <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p>
                  • <strong>Add to Home Screen:</strong> In Safari, tap Share ➔ "Add to Home Screen".
                </p>
                <p>
                  • <strong>Silent Switch:</strong> Make sure your iPhone's physical Ring/Silent switch is set to Ring or unmute so sound can play.
                </p>
                <p>
                  • <strong>Nightstand Mode:</strong> Turn on "Nightstand Screen Stay-Awake" if keeping your phone on your bedside charger.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
