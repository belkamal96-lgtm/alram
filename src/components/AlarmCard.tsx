import React from 'react';
import {
  Bell,
  Camera,
  Music,
  Trash2,
  Edit2,
  Calendar,
  Volume2,
  Play,
  Square,
} from 'lucide-react';
import { Alarm } from '../types/alarm';
import {
  formatTime24to12,
  getTimeUntilAlarm,
  NEPALI_DAYS,
} from '../utils/nepaliTime';

interface AlarmCardProps {
  alarm: Alarm;
  onToggle: (id: string) => void;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void;
  onTestRing: (alarm: Alarm) => void;
  isTestingThisAlarm: boolean;
}

export const AlarmCard: React.FC<AlarmCardProps> = ({
  alarm,
  onToggle,
  onEdit,
  onDelete,
  onTestRing,
  isTestingThisAlarm,
}) => {
  const time12 = formatTime24to12(alarm.time);
  const countdown = alarm.enabled
    ? getTimeUntilAlarm(alarm.time, alarm.repeatDays)
    : null;

  return (
    <div
      className={`relative rounded-3xl p-4 sm:p-5 border transition-all duration-200 ${
        alarm.enabled
          ? 'bg-slate-900/90 border-slate-800 shadow-xl shadow-slate-950/40 hover:border-slate-700'
          : 'bg-slate-900/40 border-slate-900/60 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Time and metadata */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
              {time12}
            </h3>
            <span className="text-xs font-semibold text-amber-400/90 uppercase">
              NPT
            </span>
          </div>

          <p className="text-sm font-semibold text-slate-300 truncate">
            {alarm.label || 'Wake Up Alarm'}
          </p>

          {/* Badges row: Photo Mission, Sound Name, Calendar Sync */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {alarm.requirePhoto && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold border border-amber-500/30">
                <Camera className="w-3 h-3 text-amber-400" />
                <span>Photo Challenge</span>
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[11px] border border-slate-700/60 truncate max-w-[180px]">
              <Music className="w-3 h-3 text-sky-400 shrink-0" />
              <span className="truncate">{alarm.soundName || 'Nepali Flute'}</span>
            </span>

            {alarm.googleCalendarSync && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 text-[11px] border border-blue-500/30">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>Synced</span>
              </span>
            )}
          </div>

          {/* Repeat days pills */}
          <div className="flex items-center gap-1 pt-1.5">
            {NEPALI_DAYS.map((day, idx) => {
              const isScheduled =
                alarm.repeatDays.length === 0 || alarm.repeatDays.includes(idx);
              const isSelectedDay = alarm.repeatDays.includes(idx);

              return (
                <span
                  key={day.short}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                    isSelectedDay
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : alarm.repeatDays.length === 0
                      ? 'bg-slate-800 text-slate-500'
                      : 'bg-slate-800 text-slate-600'
                  }`}
                  title={`${day.english} (${day.nepali})`}
                >
                  {day.short[0]}
                </span>
              );
            })}
            <span className="text-[11px] text-slate-400 ml-1">
              {alarm.repeatDays.length === 0
                ? 'Once'
                : alarm.repeatDays.length === 7
                ? 'Every day'
                : `${alarm.repeatDays.length} days/wk`}
            </span>
          </div>

          {/* Countdown string */}
          {alarm.enabled && countdown && (
            <p className="text-xs text-amber-400/90 font-medium pt-1">
              Rings {countdown} (Nepal Time)
            </p>
          )}
        </div>

        {/* Right: Toggle Switch */}
        <div className="flex flex-col items-end gap-3 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={alarm.enabled}
            onClick={() => onToggle(alarm.id)}
            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors cursor-pointer focus:outline-none ${
              alarm.enabled ? 'bg-amber-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                alarm.enabled ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>

          {/* Action buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTestRing(alarm)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isTestingThisAlarm
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
              }`}
              title={isTestingThisAlarm ? 'Stop Test' : 'Test Alarm Sound'}
            >
              {isTestingThisAlarm ? (
                <Square className="w-3.5 h-3.5 fill-current" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
            </button>

            <button
              onClick={() => onEdit(alarm)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Edit Alarm"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onDelete(alarm.id)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition cursor-pointer"
              title="Delete Alarm"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
