import React, { useState } from 'react';
import {
  X,
  Clock,
  Camera,
  Music,
  Calendar,
  Volume2,
  Sparkles,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { Alarm } from '../types/alarm';
import { NEPALI_DAYS } from '../utils/nepaliTime';
import { SoundSelectorModal } from './SoundSelectorModal';

interface AlarmModalProps {
  isOpen: boolean;
  editingAlarm?: Alarm | null;
  onSave: (alarm: Omit<Alarm, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  hasGoogleAuth: boolean;
}

const POPULAR_PRESETS = [
  { label: '05:00 AM', time: '05:00' },
  { label: '05:30 AM', time: '05:30' },
  { label: '05:40 AM', time: '05:40', highlight: true }, // The user's exact requested time!
  { label: '06:00 AM', time: '06:00' },
  { label: '06:30 AM', time: '06:30' },
  { label: '07:00 AM', time: '07:00' },
];

export const AlarmModal: React.FC<AlarmModalProps> = ({
  isOpen,
  editingAlarm,
  onSave,
  onClose,
  hasGoogleAuth,
}) => {
  // Parse initial hours & minutes (24h format)
  const initialTime = editingAlarm ? editingAlarm.time : '05:40';
  const [initH, initM] = initialTime.split(':').map((s) => parseInt(s, 10));

  const [hours, setHours] = useState(initH % 12 === 0 ? 12 : initH % 12);
  const [minutes, setMinutes] = useState(initM);
  const [isAM, setIsAM] = useState(initH < 12);

  const [label, setLabel] = useState(editingAlarm?.label || 'Wake Up Routine');
  const [repeatDays, setRepeatDays] = useState<number[]>(
    editingAlarm?.repeatDays || [1, 2, 3, 4, 5] // Default weekdays
  );
  const [soundId, setSoundId] = useState(
    editingAlarm?.soundId || 'nepali_flute'
  );
  const [soundName, setSoundName] = useState(
    editingAlarm?.soundName || 'Himalayan Morning Flute (Bansuri)'
  );
  const [volume, setVolume] = useState(editingAlarm?.volume ?? 90);
  const [vibrate, setVibrate] = useState(editingAlarm?.vibrate ?? true);
  const [gradualVolume, setGradualVolume] = useState(
    editingAlarm?.gradualVolume ?? false
  );
  const [requirePhoto, setRequirePhoto] = useState(
    editingAlarm?.requirePhoto ?? true
  );
  const [googleCalendarSync, setGoogleCalendarSync] = useState(
    editingAlarm?.googleCalendarSync ?? false
  );

  const [isSoundSelectorOpen, setIsSoundSelectorOpen] = useState(false);

  if (!isOpen) return null;

  // Convert to 24h format string: "HH:mm"
  const get24HTime = (): string => {
    let h24 = hours % 12;
    if (!isAM) h24 += 12;
    return `${h24.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}`;
  };

  const handleApplyPreset = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    setHours(h % 12 === 0 ? 12 : h % 12);
    setMinutes(m);
    setIsAM(h < 12);
  };

  const toggleDay = (dayIndex: number) => {
    setRepeatDays((prev) =>
      prev.includes(dayIndex)
        ? prev.filter((d) => d !== dayIndex)
        : [...prev, dayIndex].sort((a, b) => a - b)
    );
  };

  const handleSelectAllDays = () => {
    if (repeatDays.length === 7) {
      setRepeatDays([]);
    } else {
      setRepeatDays([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  const handleSelectWeekdays = () => {
    setRepeatDays([1, 2, 3, 4, 5]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      time: get24HTime(),
      label: label.trim() || 'Wake Up Alarm',
      enabled: true,
      repeatDays,
      soundId,
      soundName,
      volume,
      vibrate,
      gradualVolume,
      requirePhoto,
      snoozeMinutes: 5,
      googleCalendarSync,
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
        <div className="w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <span>{editingAlarm ? 'Edit Nepali Alarm' : 'New Nepali Alarm'}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Set time in Nepal Standard Time (NPT • UTC+05:45)
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Nepali Time Picker Dial / Spinners */}
            <div className="rounded-3xl bg-slate-950 p-6 border border-slate-800 text-center">
              <span className="text-[11px] font-bold text-amber-400 uppercase tracking-widest block mb-3">
                Nepali Wake-Up Time
              </span>

              <div className="flex items-center justify-center gap-3">
                {/* Hours selector */}
                <div className="flex flex-col items-center">
                  <select
                    value={hours}
                    onChange={(e) => setHours(parseInt(e.target.value, 10))}
                    className="appearance-none bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-4xl sm:text-5xl font-mono font-bold text-white text-center focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                      <option key={h} value={h}>
                        {h.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400 mt-1">Hour</span>
                </div>

                <span className="text-4xl sm:text-5xl font-mono font-bold text-amber-400 pb-5">
                  :
                </span>

                {/* Minutes selector */}
                <div className="flex flex-col items-center">
                  <select
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                    className="appearance-none bg-slate-900 border border-slate-700 rounded-2xl px-4 py-3 text-4xl sm:text-5xl font-mono font-bold text-white text-center focus:border-amber-500 focus:outline-none cursor-pointer"
                  >
                    {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                      <option key={m} value={m}>
                        {m.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400 mt-1">Minute</span>
                </div>

                {/* AM / PM Toggle */}
                <div className="flex flex-col gap-1 pb-5 ml-1">
                  <button
                    type="button"
                    onClick={() => setIsAM(true)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                      isAM
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAM(false)}
                    className={`px-3 py-2 rounded-xl text-sm font-bold transition cursor-pointer ${
                      !isAM
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              {/* Quick Time Presets */}
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <p className="text-[11px] text-slate-400 mb-2">Quick Morning Presets:</p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {POPULAR_PRESETS.map((p) => {
                    const isSelected =
                      get24HTime() === p.time;
                    return (
                      <button
                        key={p.time}
                        type="button"
                        onClick={() => handleApplyPreset(p.time)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950'
                            : p.highlight
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Special Photo Wake-Up Mission Toggle */}
            <div className="p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/40 shadow-lg shadow-amber-500/5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-5 h-5 text-amber-400" />
                    <span className="text-sm font-bold text-white">
                      Mandatory Photo Wake-Up Challenge
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    When the alarm rings, it <strong className="text-amber-300">will NOT stop ringing</strong> until you take a selfie of yourself awake and tap <strong>OK</strong>!
                  </p>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={requirePhoto}
                  onClick={() => setRequirePhoto(!requirePhoto)}
                  className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    requirePhoto ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      requirePhoto ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Alarm Label */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Alarm Label / Routine
              </label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Morning Study & Exercise"
                className="w-full px-4 py-3 rounded-2xl bg-slate-950 border border-slate-800 text-white text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Repeat Days */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-400">
                  Repeat on Days
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectWeekdays}
                    className="text-amber-400 hover:underline"
                  >
                    Weekdays
                  </button>
                  <span className="text-slate-600">•</span>
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="text-amber-400 hover:underline"
                  >
                    {repeatDays.length === 7 ? 'Clear' : 'Everyday'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1.5">
                {NEPALI_DAYS.map((day, idx) => {
                  const isSelected = repeatDays.includes(idx);
                  return (
                    <button
                      key={day.short}
                      type="button"
                      onClick={() => toggleDay(idx)}
                      className={`py-2 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span>{day.short}</span>
                      <span className="text-[9px] opacity-75">{day.shortNepali}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Alarm Song Selector Button */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Alarm Song / Ringtone
              </label>
              <button
                type="button"
                onClick={() => setIsSoundSelectorOpen(true)}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    <Music className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{soundName}</p>
                    <p className="text-xs text-slate-400">
                      Tap to change or import music from device
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Sound Volume & Gradual Ramp */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Volume2 className="w-4 h-4 text-amber-400" />
                  <span>Alarm Volume ({volume}%)</span>
                </span>
                <span className="text-xs text-slate-400">
                  {volume > 80 ? 'Loud' : volume > 40 ? 'Medium' : 'Soft'}
                </span>
              </div>

              <input
                type="range"
                min="10"
                max="100"
                step="5"
                value={volume}
                onChange={(e) => setVolume(parseInt(e.target.value, 10))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="flex items-center justify-between pt-1">
                <div>
                  <p className="text-xs font-medium text-slate-300">Gradual Volume Increase</p>
                  <p className="text-[11px] text-slate-400">Gently fades in sound over 30 seconds</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={gradualVolume}
                  onClick={() => setGradualVolume(!gradualVolume)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    gradualVolume ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      gradualVolume ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                <div>
                  <p className="text-xs font-medium text-slate-300">Vibration</p>
                  <p className="text-[11px] text-slate-400">Pulse vibration pattern on ring</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={vibrate}
                  onClick={() => setVibrate(!vibrate)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                    vibrate ? 'bg-amber-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      vibrate ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Google Calendar Sync Option */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-200">
                    Sync to Google Calendar
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Creates wake-up schedule on your primary calendar
                  </p>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={googleCalendarSync}
                onClick={() => setGoogleCalendarSync(!googleCalendarSync)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  googleCalendarSync ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    googleCalendarSync ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-2/3 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition cursor-pointer"
              >
                Save Alarm
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Sound Selector Drawer */}
      <SoundSelectorModal
        isOpen={isSoundSelectorOpen}
        selectedSoundId={soundId}
        onSelectSound={(id, name) => {
          setSoundId(id);
          setSoundName(name);
        }}
        onClose={() => setIsSoundSelectorOpen(false)}
      />
    </>
  );
};
