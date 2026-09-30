import React, { useEffect, useState, useRef } from 'react';
import {
  Bell,
  Clock,
  Plus,
  Camera,
  Calendar,
  Settings,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Play,
  Square,
  ShieldCheck,
  CheckCircle2,
  Flame,
  Smartphone,
} from 'lucide-react';
import { Alarm, NepaliTimeInfo } from './types/alarm';
import {
  getNepaliTimeInfo,
  getTimeUntilAlarm,
  formatTime24to12,
} from './utils/nepaliTime';
import {
  startAlarmRinging,
  stopAllAlarmSounds,
  previewSound,
} from './utils/audioSynthesizer';
import { NepaliClockHeader } from './components/NepaliClockHeader';
import { AlarmCard } from './components/AlarmCard';
import { AlarmModal } from './components/AlarmModal';
import { PhotoWakeUpModal } from './components/PhotoWakeUpModal';
import { WakeUpGallery } from './components/WakeUpGallery';
import { CalendarSyncPanel } from './components/CalendarSyncPanel';
import { OfflineIndicator } from './components/OfflineIndicator';
import { createAlarmCalendarEvent } from './services/calendarService';
import { getAccessToken } from './services/firebaseAuth';
import { PermissionsModal } from './components/PermissionsModal';
import { ApkExportModal } from './components/ApkExportModal';
import {
  unlockAudioSystem,
  startBackgroundAudioKeepAlive,
  showAlarmBackgroundNotification,
  getPermissionsStatus,
} from './utils/backgroundAlarmManager';

const LOCAL_STORAGE_KEY = 'prabhat_nepali_alarms_v1';

// Initial default alarm at 5:40 AM Nepali Time as requested by the user
const INITIAL_ALARMS: Alarm[] = [
  {
    id: 'alarm_540am_default',
    time: '05:40',
    label: 'Early Morning Routine',
    enabled: true,
    repeatDays: [0, 1, 2, 3, 4, 5, 6], // Every day
    soundId: 'nepali_flute',
    soundName: 'Himalayan Morning Flute (Bansuri)',
    volume: 95,
    vibrate: true,
    gradualVolume: true,
    requirePhoto: true, // Special Photo Wake-Up Challenge
    snoozeMinutes: 0, // Must take photo to stop
    googleCalendarSync: false,
    createdAt: Date.now(),
  },
  {
    id: 'alarm_630am_workout',
    time: '06:30',
    label: 'Morning Yoga & Walk',
    enabled: false,
    repeatDays: [1, 2, 3, 4, 5],
    soundId: 'temple_singing_bowl',
    soundName: 'Tibetan Singing Bowl & Bells',
    volume: 85,
    vibrate: true,
    gradualVolume: false,
    requirePhoto: true,
    snoozeMinutes: 5,
    googleCalendarSync: false,
    createdAt: Date.now() - 10000,
  },
];

export default function App() {
  const [nepaliTime, setNepaliTime] = useState<NepaliTimeInfo>(() =>
    getNepaliTimeInfo()
  );
  const [alarms, setAlarms] = useState<Alarm[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Fallback
    }
    return INITIAL_ALARMS;
  });

  const [activeTab, setActiveTab] = useState<'alarms' | 'gallery' | 'calendar' | 'quick'>('alarms');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);

  // Active ringing alarm (triggers full-screen wake-up photo challenge)
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);

  // Testing sound in card
  const [testingAlarmId, setTestingAlarmId] = useState<string | null>(null);
  const [hasGoogleAuth, setHasGoogleAuth] = useState(false);

  // Last triggered minute tracker to avoid firing multiple times in same minute
  const lastTriggeredMinuteRef = useRef<string>('');

  // Persist alarms to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(alarms));
    } catch (err) {
      console.warn('Failed to save alarms to localStorage:', err);
    }
  }, [alarms]);

  // Check auth state for Google Calendar and check permissions
  useEffect(() => {
    getAccessToken().then((token) => setHasGoogleAuth(!!token));
    getPermissionsStatus().then((s) => setNotifGranted(s.notifications === 'granted'));
  }, []);

  // Unlock audio system on first user gesture (ensures audio plays in background)
  useEffect(() => {
    const handleFirstGesture = () => {
      unlockAudioSystem();
      startBackgroundAudioKeepAlive();
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('touchstart', handleFirstGesture, { once: true });
    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
    };
  }, []);

  // Check alarms logic
  const checkAlarms = (currentNpt: NepaliTimeInfo) => {
    const currentHHmm = currentNpt.timeShort24;
    const currentDay = currentNpt.dayIndex;
    const currentSeconds = currentNpt.seconds;

    // Trigger at 00-02 seconds of the matching minute
    if (currentSeconds <= 2 && lastTriggeredMinuteRef.current !== currentHHmm) {
      const matchingAlarm = alarms.find((a) => {
        if (!a.enabled) return false;
        if (a.time !== currentHHmm) return false;
        // Check repeat days (empty means once)
        if (a.repeatDays.length === 0) return true;
        return a.repeatDays.includes(currentDay);
      });

      if (matchingAlarm && !ringingAlarm) {
        lastTriggeredMinuteRef.current = currentHHmm;
        triggerAlarm(matchingAlarm);
      }
    }
  };

  // Main 1-second clock loop + background Web Worker
  useEffect(() => {
    // 1. Standard window interval
    const timer = setInterval(() => {
      const currentNpt = getNepaliTimeInfo();
      setNepaliTime(currentNpt);
      checkAlarms(currentNpt);
    }, 1000);

    // 2. Web Worker background thread (survives mobile tab throttling when minimized)
    let worker: Worker | null = null;
    try {
      if (typeof Worker !== 'undefined') {
        worker = new Worker('/alarmWorker.js');
        worker.postMessage({ action: 'start', interval: 1000 });
        worker.onmessage = () => {
          const currentNpt = getNepaliTimeInfo();
          setNepaliTime(currentNpt);
          checkAlarms(currentNpt);
        };
      }
    } catch (e) {
      console.warn('Worker initialization fallback:', e);
    }

    return () => {
      clearInterval(timer);
      if (worker) {
        worker.postMessage({ action: 'stop' });
        worker.terminate();
      }
    };
  }, [alarms, ringingAlarm]);

  const triggerAlarm = (alarm: Alarm) => {
    setRingingAlarm(alarm);
    // Play loud audio (looping)
    startAlarmRinging(alarm.soundId, alarm.volume, alarm.gradualVolume);
    // Dispatch system notification & vibration for background mobile alert
    showAlarmBackgroundNotification(alarm);
  };

  const handleDismissRingingAlarm = () => {
    stopAllAlarmSounds();
    if (ringingAlarm) {
      // If alarm was one-time (repeatDays empty), toggle off
      if (ringingAlarm.repeatDays.length === 0) {
        setAlarms((prev) =>
          prev.map((a) => (a.id === ringingAlarm.id ? { ...a, enabled: false } : a))
        );
      }
    }
    setRingingAlarm(null);
  };

  // Immediate test wake-up trigger for demonstration / review
  const handleTestNow = () => {
    const demoAlarm: Alarm = {
      id: 'demo_test',
      time: nepaliTime.timeShort24,
      label: 'Wake-Up Photo Challenge (Test Demo)',
      enabled: true,
      repeatDays: [],
      soundId: 'nepali_flute',
      soundName: 'Himalayan Morning Flute (Bansuri)',
      volume: 85,
      vibrate: true,
      gradualVolume: false,
      requirePhoto: true,
      snoozeMinutes: 0,
      createdAt: Date.now(),
    };
    triggerAlarm(demoAlarm);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleOpenCreateModal = () => {
    setEditingAlarm(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (alarm: Alarm) => {
    setEditingAlarm(alarm);
    setIsModalOpen(true);
  };

  const handleDeleteAlarm = (id: string) => {
    if (confirm('Delete this alarm?')) {
      setAlarms((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleSaveAlarm = async (data: Omit<Alarm, 'id' | 'createdAt'>) => {
    if (editingAlarm) {
      setAlarms((prev) =>
        prev.map((a) =>
          a.id === editingAlarm.id ? { ...a, ...data } : a
        )
      );
    } else {
      const newAlarm: Alarm = {
        ...data,
        id: `alarm_${Date.now()}`,
        createdAt: Date.now(),
      };
      setAlarms((prev) => [newAlarm, ...prev]);

      // If user toggled Google Calendar sync on create
      if (newAlarm.googleCalendarSync) {
        try {
          await createAlarmCalendarEvent(newAlarm.label, newAlarm.time, newAlarm.repeatDays);
        } catch (err) {
          console.warn('Could not auto-sync to Google Calendar:', err);
        }
      }
    }
    setIsModalOpen(false);
    setEditingAlarm(null);
  };

  const handleTestRing = (alarm: Alarm) => {
    if (testingAlarmId === alarm.id) {
      stopAllAlarmSounds();
      setTestingAlarmId(null);
    } else {
      setTestingAlarmId(alarm.id);
      previewSound(alarm.soundId, alarm.volume);
      setTimeout(() => {
        setTestingAlarmId((curr) => (curr === alarm.id ? null : curr));
      }, 4500);
    }
  };

  // Quick Nap Preset trigger
  const handleQuickNap = (minutesToAdd: number) => {
    const current = getNepaliTimeInfo();
    const totalMinutes = current.hours * 60 + current.minutes + minutesToAdd;
    const targetH = Math.floor(totalMinutes / 60) % 24;
    const targetM = totalMinutes % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const napTime = `${pad(targetH)}:${pad(targetM)}`;

    const napAlarm: Alarm = {
      id: `nap_${Date.now()}`,
      time: napTime,
      label: `${minutesToAdd}m Power Nap`,
      enabled: true,
      repeatDays: [], // One-time
      soundId: 'nepali_flute',
      soundName: 'Himalayan Morning Flute (Bansuri)',
      volume: 90,
      vibrate: true,
      gradualVolume: true,
      requirePhoto: true,
      snoozeMinutes: 0,
      createdAt: Date.now(),
    };

    setAlarms((prev) => [napAlarm, ...prev]);
    setActiveTab('alarms');
  };

  const handleSyncAlarmToCalendar = async (alarm: Alarm) => {
    await createAlarmCalendarEvent(alarm.label, alarm.time, alarm.repeatDays);
    setAlarms((prev) =>
      prev.map((a) => (a.id === alarm.id ? { ...a, googleCalendarSync: true } : a))
    );
  };

  // Find next enabled upcoming alarm
  const enabledAlarms = alarms.filter((a) => a.enabled);
  const nextAlarmCountdown =
    enabledAlarms.length > 0
      ? getTimeUntilAlarm(enabledAlarms[0].time, enabledAlarms[0].repeatDays)
      : null;
  const nextAlarmTime =
    enabledAlarms.length > 0 ? formatTime24to12(enabledAlarms[0].time) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-lg mx-auto shadow-2xl relative">
      <OfflineIndicator />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-5 pb-28 space-y-5">
        {/* Top App Title Header */}
        <header className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-lg shadow-amber-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                <span>प्रभात</span>
                <span className="text-amber-400 font-bold text-sm tracking-normal">
                  Prabhat
                </span>
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Nepali Time • Photo Wake-Up Alarm
              </p>
            </div>
          </div>

          {/* Quick Actions in Header */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsApkModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition cursor-pointer"
              title="Get Android APK / Native Installation"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Get APK</span>
            </button>

            <button
              onClick={() => setIsPermissionsModalOpen(true)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                notifGranted
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 animate-pulse'
              }`}
              title="Configure mobile permissions & background ringing"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>{notifGranted ? 'Permissions' : 'Permissions'}</span>
            </button>

            <button
              onClick={handleTestNow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold transition cursor-pointer"
              title="Simulate the wake-up photo challenge now"
            >
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Test Alarm</span>
            </button>
          </div>
        </header>

        {/* Background Ringing Advisory Banner if not configured yet */}
        {!notifGranted && (
          <div
            onClick={() => setIsPermissionsModalOpen(true)}
            className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-500/15 transition text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Enable Mobile Background Ringing</p>
                <p className="text-[11px] text-slate-300">
                  Tap to grant notification & audio permissions so alarms ring when phone is locked.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-400 shrink-0">Setup ➔</span>
          </div>
        )}

        {/* Live Nepali Time Clock Card (Always Locked to Nepal Time) */}
        <NepaliClockHeader
          nepaliTime={nepaliTime}
          nextAlarmCountdown={nextAlarmCountdown}
          nextAlarmTime={nextAlarmTime}
        />

        {/* Tab Switcher */}
        <div className="flex items-center justify-between p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('alarms')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'alarms'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alarms ({alarms.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'quick'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Power Nap</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Selfies</span>
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'calendar'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Calendar</span>
          </button>
        </div>

        {/* Tab 1: Alarms List */}
        {activeTab === 'alarms' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                My Alarms (Nepali Time)
              </h2>
              <span className="text-xs text-amber-400">
                {enabledAlarms.length} Active
              </span>
            </div>

            {alarms.length === 0 ? (
              <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">No Alarms Set</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tap the '+' button below to schedule an alarm for 5:40 AM NPT or your custom routine.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {alarms.map((alarm) => (
                  <AlarmCard
                    key={alarm.id}
                    alarm={alarm}
                    onToggle={handleToggleAlarm}
                    onEdit={handleOpenEditModal}
                    onDelete={handleDeleteAlarm}
                    onTestRing={handleTestRing}
                    isTestingThisAlarm={testingAlarmId === alarm.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Power Nap Quick Alarms */}
        {activeTab === 'quick' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Quick Power Naps</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set a quick Nepali-time alarm in 1-tap. Still requires photo challenge to wake you up!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { min: 15, label: '15m Micro Nap', desc: 'Boost alertness & focus' },
                { min: 30, label: '30m Power Nap', desc: 'Refresh memory & clarity' },
                { min: 45, label: '45m Restorative', desc: 'Deep rest recovery' },
                { min: 60, label: '60m Full Cycle', desc: 'Full brain rejuvenation' },
              ].map((nap) => (
                <button
                  key={nap.min}
                  onClick={() => handleQuickNap(nap.min)}
                  className="p-4 rounded-3xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/90 transition text-left cursor-pointer group shadow-lg"
                >
                  <div className="w-9 h-9 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-base font-extrabold text-white">+{nap.min} min</p>
                  <p className="text-xs font-semibold text-amber-400">{nap.label}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{nap.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Morning Selfie Gallery & Streak */}
        {activeTab === 'gallery' && <WakeUpGallery />}

        {/* Tab 4: Google Calendar Sync */}
        {activeTab === 'calendar' && (
          <CalendarSyncPanel
            alarms={alarms}
            onSyncAlarmToCalendar={handleSyncAlarmToCalendar}
          />
        )}
      </main>

      {/* Floating Action Button: Add New Alarm */}
      {activeTab === 'alarms' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-sm shadow-2xl shadow-amber-500/40 transition transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[3]" />
            <span>Add Alarm</span>
          </button>
        </div>
      )}

      {/* Create / Edit Alarm Modal */}
      <AlarmModal
        isOpen={isModalOpen}
        editingAlarm={editingAlarm}
        onSave={handleSaveAlarm}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAlarm(null);
        }}
        hasGoogleAuth={hasGoogleAuth}
      />

      {/* Mandatory Photo Wake-Up Screen (Active Ringing Mode) */}
      {ringingAlarm && (
        <PhotoWakeUpModal
          alarm={ringingAlarm}
          onDismiss={handleDismissRingingAlarm}
        />
      )}

      {/* Permissions and Background Alarm Configuration Modal */}
      <PermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => {
          setIsPermissionsModalOpen(false);
          getPermissionsStatus().then((s) => setNotifGranted(s.notifications === 'granted'));
        }}
      />

      {/* APK & Android Installation Modal */}
      <ApkExportModal
        isOpen={isApkModalOpen}
        onClose={() => setIsApkModalOpen(false)}
      />
    </div>
  );
}
