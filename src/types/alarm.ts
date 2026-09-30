export type BuiltInSoundId =
  | 'nepali_flute'
  | 'twin_bell'
  | 'digital_chirp'
  | 'temple_singing_bowl'
  | 'rooster_morning'
  | 'sunrise_siren';

export interface SoundOption {
  id: string;
  name: string;
  category: 'builtin' | 'custom';
  description: string;
}

export interface CustomSoundRecord {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: number;
  audioBlob: Blob;
}

export interface Alarm {
  id: string;
  time: string; // "HH:mm" in 24-hour format (e.g. "05:40")
  label: string; // e.g. "Morning Routine & College"
  enabled: boolean;
  repeatDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat. Empty array means One-time alarm
  soundId: string; // Built-in or custom sound ID
  soundName: string;
  volume: number; // 0 to 100
  vibrate: boolean;
  gradualVolume: boolean;
  requirePhoto: boolean; // Special requirement: must take photo and tap OK to stop
  snoozeMinutes: number; // 0 = disabled, 5, 10
  googleCalendarSync?: boolean;
  googleCalendarEventId?: string;
  createdAt: number;
}

export interface WakeUpLogEntry {
  id: string;
  alarmId?: string;
  alarmLabel: string;
  alarmTimeNPT: string;
  actualWakeUpTimeNPT: string;
  dateBS: string;
  dateGregorian: string;
  photoDataUrl: string; // Base64 selfie
  timestamp: number;
}

export interface NepaliTimeInfo {
  nepaliDate: Date; // Date object shifted to Nepal Time (UTC + 5:45)
  hours: number;
  minutes: number;
  seconds: number;
  isAM: boolean;
  time12: string; // "05:40:00 AM"
  time24: string; // "05:40:00"
  timeShort12: string; // "05:40 AM"
  timeShort24: string; // "05:40"
  dayOfWeekNepali: string; // "बुधबार"
  dayOfWeekEnglish: string; // "Wednesday"
  dayIndex: number; // 0 to 6
  dateBS: {
    year: number;
    month: number;
    monthNameNepali: string;
    monthNameEnglish: string;
    day: number;
    formattedNepali: string; // e.g. "२०८३ असोज १४, बुधबार"
    formattedEnglish: string; // e.g. "14 Ashwin 2083 BS"
  };
  gregorianDateString: string;
}
