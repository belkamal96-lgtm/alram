import React, { useState } from 'react';
import {
  Clock,
  Calendar,
  Globe,
  MapPin,
  Sparkles,
  Bell,
  Sun,
  Moon,
  ChevronRight,
} from 'lucide-react';
import { NepaliTimeInfo } from '../types/alarm';
import { toNepaliDigits } from '../utils/nepaliTime';
import { PWAInstallButton } from './PWAInstallButton';

interface NepaliClockHeaderProps {
  nepaliTime: NepaliTimeInfo;
  nextAlarmCountdown: string | null;
  nextAlarmTime: string | null;
}

export const NepaliClockHeader: React.FC<NepaliClockHeaderProps> = ({
  nepaliTime,
  nextAlarmCountdown,
  nextAlarmTime,
}) => {
  const [showNepaliNumerals, setShowNepaliNumerals] = useState(false);

  // Compare with local device time
  const localDate = new Date();
  const localHour12 = localDate.getHours() % 12 === 0 ? 12 : localDate.getHours() % 12;
  const localTimeStr = `${localHour12.toString().padStart(2, '0')}:${localDate
    .getMinutes()
    .toString()
    .padStart(2, '0')} ${localDate.getHours() < 12 ? 'AM' : 'PM'}`;
  const localTzName =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'Device Local';

  // Determine daylight icon based on Nepal hour
  const isNepalDay = nepaliTime.hours >= 6 && nepaliTime.hours < 18;

  // Split Nepal time into hours, minutes, seconds, AM/PM
  const pad = (n: number) => n.toString().padStart(2, '0');
  const h12 = nepaliTime.hours % 12 === 0 ? 12 : nepaliTime.hours % 12;
  const hStr = showNepaliNumerals ? toNepaliDigits(pad(h12)) : pad(h12);
  const mStr = showNepaliNumerals ? toNepaliDigits(pad(nepaliTime.minutes)) : pad(nepaliTime.minutes);
  const sStr = showNepaliNumerals ? toNepaliDigits(pad(nepaliTime.seconds)) : pad(nepaliTime.seconds);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-2xl">
      {/* Subtle Himalayan Mountain Skyline SVG Silhouette in background */}
      <div className="absolute inset-0 pointer-events-none opacity-10 flex items-end">
        <svg
          viewBox="0 0 1000 300"
          className="w-full h-36 object-cover"
          preserveAspectRatio="none"
        >
          <polygon
            points="0,300 150,140 280,240 450,110 580,220 720,80 880,250 1000,160 1000,300"
            fill="#f59e0b"
          />
        </svg>
      </div>

      <div className="relative z-10 space-y-4">
        {/* Top badges: Fixed Nepal Time badge + PWA Install button */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>Nepal Time (NPT • UTC+05:45)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNepaliNumerals(!showNepaliNumerals)}
              className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-[11px] font-medium text-slate-300 border border-slate-700 transition cursor-pointer"
              title="Toggle Devanagari numerals"
            >
              {showNepaliNumerals ? 'English Digits' : 'नेपाली अङ्क (१२३)'}
            </button>
            <PWAInstallButton />
          </div>
        </div>

        {/* Big Live Digital Clock Display */}
        <div className="text-center py-2">
          <div className="inline-flex items-baseline justify-center gap-1 sm:gap-2 font-mono tracking-tight text-white select-none">
            <span className="text-5xl sm:text-6xl font-black text-white drop-shadow-md">
              {hStr}
            </span>
            <span className="text-4xl sm:text-5xl font-bold text-amber-400 animate-pulse">
              :
            </span>
            <span className="text-5xl sm:text-6xl font-black text-white drop-shadow-md">
              {mStr}
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-amber-400/80">
              :
            </span>
            <span className="text-2xl sm:text-3xl font-semibold text-slate-400 w-12 sm:w-14 text-left">
              {sStr}
            </span>
            <span className="text-lg sm:text-xl font-bold text-amber-400 ml-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30">
              {nepaliTime.isAM ? 'AM' : 'PM'}
            </span>
          </div>

          {/* Day / Night indicator */}
          <div className="flex items-center justify-center gap-1.5 mt-1 text-xs text-slate-400">
            {isNepalDay ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-sky-400" />
            )}
            <span>
              {nepaliTime.isAM
                ? nepaliTime.hours < 5
                  ? 'राति (Night / Early Dawn)'
                  : 'बिहान (Morning / Prabhat)'
                : nepaliTime.hours < 16
                ? 'दिउँसो (Afternoon)'
                : nepaliTime.hours < 20
                ? 'साँझ (Evening / Dusk)'
                : 'राति (Night)'}
            </span>
          </div>
        </div>

        {/* Bikram Sambat Date & Gregorian Date Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-800/60 border border-slate-800">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">
                {nepaliTime.dateBS.formattedNepali}
              </p>
              <p className="text-[11px] text-amber-400/80">
                {nepaliTime.dateBS.formattedEnglish}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-slate-800/60 border border-slate-800">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-400">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-200 truncate">
                {nepaliTime.gregorianDateString}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                Device ({localTzName}): {localTimeStr}
              </p>
            </div>
          </div>
        </div>

        {/* Next Alarm Banner */}
        {nextAlarmCountdown && nextAlarmTime && (
          <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  Next Alarm at {nextAlarmTime} NPT
                </p>
                <p className="text-[11px] text-amber-300">
                  Rings {nextAlarmCountdown}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
