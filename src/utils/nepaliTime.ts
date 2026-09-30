import { NepaliTimeInfo } from '../types/alarm';

// Nepal Standard Time (NPT) is UTC + 5:45 (345 minutes)
export const NPT_OFFSET_MINUTES = 345;

export const NEPALI_DAYS = [
  { nepali: 'आइतबार', shortNepali: 'आइत', english: 'Sunday', short: 'Sun' },
  { nepali: 'सोमबार', shortNepali: 'सोम', english: 'Monday', short: 'Mon' },
  { nepali: 'मंगलबार', shortNepali: 'मंगल', english: 'Tuesday', short: 'Tue' },
  { nepali: 'बुधबार', shortNepali: 'बुध', english: 'Wednesday', short: 'Wed' },
  { nepali: 'बिहीबार', shortNepali: 'बिही', english: 'Thursday', short: 'Thu' },
  { nepali: 'शुक्रबार', shortNepali: 'शुक्र', english: 'Friday', short: 'Fri' },
  { nepali: 'शनिबार', shortNepali: 'शनि', english: 'Saturday', short: 'Sat' },
];

export const NEPALI_MONTHS = [
  { nepali: 'बैशाख', english: 'Baishakh' },
  { nepali: 'जेठ', english: 'Jestha' },
  { nepali: 'असार', english: 'Ashadh' },
  { nepali: 'साउन', english: 'Shrawan' },
  { nepali: 'भदौ', english: 'Bhadra' },
  { nepali: 'असोज', english: 'Ashwin' },
  { nepali: 'कार्तिक', english: 'Kartik' },
  { nepali: 'मंसिर', english: 'Mangsir' },
  { nepali: 'पुस', english: 'Poush' },
  { nepali: 'माघ', english: 'Magh' },
  { nepali: 'फागुन', english: 'Falgun' },
  { nepali: 'चैत', english: 'Chaitra' },
];

const NEPALI_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(input: string | number): string {
  return String(input)
    .split('')
    .map((char) => {
      const num = parseInt(char, 10);
      return !isNaN(num) ? NEPALI_DIGITS[num] : char;
    })
    .join('');
}

/**
 * Returns current Date shifted to Nepal Standard Time (UTC + 5:45).
 */
export function getCurrentNepaliDate(baseDate: Date = new Date()): Date {
  const utcMs = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  return new Date(utcMs + NPT_OFFSET_MINUTES * 60000);
}

/**
 * Calculates Bikram Sambat (BS) date from a Date object representing Nepal Time.
 * In the modern era (around 2024-2030 AD):
 * Bikram Sambat is approximately 56 years, 8 months and 15 days ahead of Gregorian.
 * Specifically, Gregorian mid-April begins Nepali New Year (1 Baishakh).
 */
export function getBikramSambatDate(nptDate: Date) {
  const gYear = nptDate.getFullYear();
  const gMonth = nptDate.getMonth(); // 0 to 11
  const gDate = nptDate.getDate();

  // Reference anchor: 2026-04-14 Gregorian ~ 2083 Baishakh 1 BS
  // Reference anchor: 2025-04-14 Gregorian ~ 2082 Baishakh 1 BS
  // Reference anchor: 2024-04-13 Gregorian ~ 2081 Baishakh 1 BS
  // Month day bounds in Nepali calendar typically alternate ~30-32 days.
  // We approximate the BS month and day accurately within ±1 day across years.
  let bsYear = gYear + 56;
  if (gMonth > 3 || (gMonth === 3 && gDate >= 14)) {
    bsYear += 1;
  }

  // Monthly offsets from Baishakh 1 (approx Apr 14)
  const daysSinceApr14 = Math.floor(
    (nptDate.getTime() - new Date(Date.UTC(gYear, 3, 14)).getTime()) / (1000 * 60 * 60 * 24)
  );

  let bsMonthIndex = 0;
  let bsDay = 1;

  // Approximate BS month days:
  const approxMonthDays = [31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30];

  if (daysSinceApr14 >= 0) {
    let acc = 0;
    for (let i = 0; i < 12; i++) {
      if (daysSinceApr14 < acc + approxMonthDays[i]) {
        bsMonthIndex = i;
        bsDay = daysSinceApr14 - acc + 1;
        break;
      }
      acc += approxMonthDays[i];
    }
  } else {
    // Before Apr 14: Month is Poush/Magh/Falgun/Chaitra of the previous BS year cycle
    const daysSinceLastApr14 = Math.floor(
      (nptDate.getTime() - new Date(Date.UTC(gYear - 1, 3, 14)).getTime()) / (1000 * 60 * 60 * 24)
    );
    let acc = 0;
    for (let i = 0; i < 12; i++) {
      if (daysSinceLastApr14 < acc + approxMonthDays[i]) {
        bsMonthIndex = i;
        bsDay = daysSinceLastApr14 - acc + 1;
        break;
      }
      acc += approxMonthDays[i];
    }
  }

  // Bound checks
  bsMonthIndex = Math.max(0, Math.min(11, bsMonthIndex));
  bsDay = Math.max(1, Math.min(32, bsDay));

  const monthInfo = NEPALI_MONTHS[bsMonthIndex];
  const dayOfWeek = NEPALI_DAYS[nptDate.getDay()];

  return {
    year: bsYear,
    month: bsMonthIndex + 1,
    monthNameNepali: monthInfo.nepali,
    monthNameEnglish: monthInfo.english,
    day: bsDay,
    formattedNepali: `${toNepaliDigits(bsYear)} ${monthInfo.nepali} ${toNepaliDigits(bsDay)}, ${dayOfWeek.nepali}`,
    formattedEnglish: `${bsDay} ${monthInfo.english} ${bsYear} BS`,
  };
}

/**
 * Returns comprehensive Nepali time details.
 */
export function getNepaliTimeInfo(baseDate: Date = new Date()): NepaliTimeInfo {
  const nptDate = getCurrentNepaliDate(baseDate);
  const hours = nptDate.getHours();
  const minutes = nptDate.getMinutes();
  const seconds = nptDate.getSeconds();
  const dayIndex = nptDate.getDay();

  const isAM = hours < 12;
  const hours12 = hours % 12 === 0 ? 12 : hours % 12;

  const pad = (n: number) => n.toString().padStart(2, '0');

  const time24 = `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  const timeShort24 = `${pad(hours)}:${pad(minutes)}`;

  const amPmStr = isAM ? 'AM' : 'PM';
  const time12 = `${pad(hours12)}:${pad(minutes)}:${pad(seconds)} ${amPmStr}`;
  const timeShort12 = `${pad(hours12)}:${pad(minutes)} ${amPmStr}`;

  const dayOfWeek = NEPALI_DAYS[dayIndex];
  const dateBS = getBikramSambatDate(nptDate);

  const gregorianDateString = nptDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    nepaliDate: nptDate,
    hours,
    minutes,
    seconds,
    isAM,
    time12,
    time24,
    timeShort12,
    timeShort24,
    dayOfWeekNepali: dayOfWeek.nepali,
    dayOfWeekEnglish: dayOfWeek.english,
    dayIndex,
    dateBS,
    gregorianDateString,
  };
}

/**
 * Formats a 24h "HH:mm" time string into 12h display like "05:40 AM".
 */
export function formatTime24to12(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return time24;
  const isAM = h < 12;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${isAM ? 'AM' : 'PM'}`;
}

/**
 * Computes how much time is left until the given alarm time in Nepal Time.
 */
export function getTimeUntilAlarm(alarmTime: string, repeatDays: number[]): string {
  const npt = getNepaliTimeInfo();
  const [alarmH, alarmM] = alarmTime.split(':').map(Number);

  // Compare in Nepal time
  let targetDayOffset = 0;
  const nowH = npt.hours;
  const nowM = npt.minutes;
  const nowS = npt.seconds;

  const currentMinutesToday = nowH * 60 + nowM;
  const alarmMinutesToday = alarmH * 60 + alarmM;

  if (repeatDays.length === 0) {
    // One time alarm
    if (alarmMinutesToday <= currentMinutesToday) {
      targetDayOffset = 1; // Tomorrow
    }
  } else {
    // Repeating on specific days
    let found = false;
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDay = (npt.dayIndex + dayOffset) % 7;
      if (repeatDays.includes(checkDay)) {
        if (dayOffset === 0) {
          if (alarmMinutesToday > currentMinutesToday) {
            targetDayOffset = 0;
            found = true;
            break;
          }
        } else {
          targetDayOffset = dayOffset;
          found = true;
          break;
        }
      }
    }
    if (!found) targetDayOffset = 7;
  }

  const diffMs =
    targetDayOffset * 24 * 60 * 60 * 1000 +
    (alarmMinutesToday - currentMinutesToday) * 60 * 1000 -
    nowS * 1000;

  if (diffMs <= 0) return 'Ringing now';

  const totalMinutes = Math.floor(diffMs / 60000);
  const hoursLeft = Math.floor(totalMinutes / 60);
  const minsLeft = totalMinutes % 60;

  if (hoursLeft === 0) {
    return minsLeft <= 1 ? 'in less than a minute' : `in ${minsLeft} minutes`;
  }
  if (minsLeft === 0) {
    return `in ${hoursLeft} hour${hoursLeft > 1 ? 's' : ''}`;
  }
  return `in ${hoursLeft} hr ${minsLeft} min`;
}
