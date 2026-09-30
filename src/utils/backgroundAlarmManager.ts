import { Alarm } from '../types/alarm';
import { getNepaliTimeInfo } from './nepaliTime';

export interface PermissionsState {
  notifications: 'granted' | 'denied' | 'prompt' | 'unsupported';
  camera: 'granted' | 'denied' | 'prompt';
  audioUnlocked: boolean;
  wakeLockSupported: boolean;
  wakeLockActive: boolean;
  backgroundKeepAliveActive: boolean;
}

let silentAudioElement: HTMLAudioElement | null = null;
let wakeLockSentinel: unknown = null;
let isAudioUnlocked = false;

// 1-second base64 silent WAV audio loop to keep mobile audio session alive in background
// This is the proven industry standard method for iOS Safari and Android Chrome PWAs.
const SILENT_WAV_BASE64 =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';

/**
 * Initializes and unlocks the browser audio context with user gesture.
 */
export function unlockAudioSystem(): boolean {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a short inaudible sine burst to mark context as user-activated
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = 0.0001; // virtually silent
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(0);
      osc.stop(0.05);
    }
    isAudioUnlocked = true;
    return true;
  } catch (err) {
    console.warn('Audio unlock warning:', err);
    return false;
  }
}

/**
 * Starts silent audio playback in background so mobile OS (iOS & Android)
 * does not kill JavaScript timers or freeze the audio hardware.
 */
export function startBackgroundAudioKeepAlive(): boolean {
  try {
    if (!silentAudioElement) {
      silentAudioElement = new Audio(SILENT_WAV_BASE64);
      silentAudioElement.loop = true;
      silentAudioElement.volume = 0.01;
    }
    silentAudioElement.play().catch((err) => {
      console.warn('Could not auto-start silent keep-alive:', err);
    });
    return true;
  } catch (e) {
    console.warn('Keep alive audio error:', e);
    return false;
  }
}

export function stopBackgroundAudioKeepAlive() {
  if (silentAudioElement) {
    try {
      silentAudioElement.pause();
      silentAudioElement.currentTime = 0;
    } catch {
      // ignore
    }
  }
}

/**
 * Requests Screen WakeLock so phone screen doesn't turn off if on nightstand.
 */
export async function enableScreenWakeLock(): Promise<boolean> {
  if ('wakeLock' in navigator) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (wakeLockSentinel as any).addEventListener('release', () => {
        wakeLockSentinel = null;
      });
      return true;
    } catch (err) {
      console.warn('WakeLock error:', err);
      return false;
    }
  }
  return false;
}

export async function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (wakeLockSentinel as any).release();
    } catch {
      // ignore
    }
    wakeLockSentinel = null;
  }
}

/**
 * Requests Notification permission.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  return await Notification.requestPermission();
}

/**
 * Pre-requests Camera permission so that when alarm rings,
 * user doesn't face a browser permission prompt while drowsy!
 */
export async function preRequestCameraPermission(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
    });
    // Immediately stop tracks after testing permission
    stream.getTracks().forEach((t) => t.stop());
    return true;
  } catch (err) {
    console.warn('Camera pre-check error:', err);
    return false;
  }
}

/**
 * Web Locks API keep-alive for Android/Desktop browsers so background tabs are never terminated.
 */
let hasAcquiredWebLock = false;
export function requestWebLockKeepAlive() {
  if (hasAcquiredWebLock) return;
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    try {
      hasAcquiredWebLock = true;
      navigator.locks.request('prabhat_nepali_alarm_lock', { mode: 'shared' }, () => {
        return new Promise(() => {
          // Keep promise pending forever while tab is open
        });
      });
    } catch (e) {
      console.warn('WebLocks request warning:', e);
    }
  }
}

/**
 * Triggers a high-priority system notification with custom vibration & audio tag,
 * with direct lockscreen action buttons for Upload Photo and Dismiss.
 */
export async function showAlarmBackgroundNotification(alarm: Alarm) {
  const title = `⏰ Prabhat Alarm Ringing! (${alarm.time} NPT)`;
  const body = `${alarm.label || 'Wake Up Alarm'} — Mandatory Wake-Up Photo Challenge! Tap to upload photo and stop alarm.`;

  // Vibration pattern
  if ('vibrate' in navigator && alarm.vibrate) {
    navigator.vibrate([600, 300, 600, 300, 600, 300, 1000]);
  }

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // Check for ServiceWorker registration first for robust lockscreen mobile notification
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          // Tell ServiceWorker to post notification or wake window
          if (registration.active) {
            registration.active.postMessage({
              type: 'TRIGGER_LOCKSCREEN_ALARM',
              alarm: {
                id: alarm.id,
                time: alarm.time,
                label: alarm.label,
              },
            });
          }

          if (typeof registration.showNotification === 'function') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (registration as any).showNotification(title, {
              body,
              icon: '/pwa-192x192.png',
              badge: '/icon.svg',
              tag: 'prabhat-nepali-alarm',
              requireInteraction: true,
              vibrate: [600, 300, 600, 300, 600, 300, 1000],
              renotify: true,
              actions: [
                {
                  action: 'upload_photo',
                  title: '📷 Upload Photo',
                },
                {
                  action: 'open_challenge',
                  title: '☀️ Stop Alarm',
                },
              ],
              data: {
                alarmId: alarm.id,
                action: 'upload_photo',
                timestamp: Date.now(),
              },
            });
            return;
          }
        }
      }

      // Fallback to standard window Notification
      const notif = new Notification(title, {
        body,
        icon: '/pwa-192x192.png',
        tag: 'prabhat-nepali-alarm',
        requireInteraction: true,
      });

      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    } catch (e) {
      console.warn('Failed to dispatch notification:', e);
    }
  }
}

/**
 * Grants all necessary mobile permissions in one user tap!
 */
export async function grantAllPermissions(): Promise<{
  notifications: boolean;
  camera: boolean;
  audio: boolean;
  wakeLock: boolean;
}> {
  // 1. Audio unlock
  const audioOk = unlockAudioSystem();
  startBackgroundAudioKeepAlive();

  // 2. Notification permission
  let notifOk = false;
  try {
    const notifResult = await requestNotificationPermission();
    notifOk = notifResult === 'granted';
  } catch {
    // ignore
  }

  // 3. Camera pre-permission
  let cameraOk = false;
  try {
    cameraOk = await preRequestCameraPermission();
  } catch {
    // ignore
  }

  // 4. WakeLock
  const wakeLockOk = await enableScreenWakeLock();

  return {
    notifications: notifOk,
    camera: cameraOk,
    audio: audioOk,
    wakeLock: wakeLockOk,
  };
}

/**
 * Returns current status of all mobile permissions.
 */
export async function getPermissionsStatus(): Promise<PermissionsState> {
  let notifStatus: PermissionsState['notifications'] = 'unsupported';
  if ('Notification' in window) {
    notifStatus = Notification.permission === 'default' ? 'prompt' : Notification.permission;
  }

  let cameraStatus: PermissionsState['camera'] = 'prompt';
  if (navigator.permissions && navigator.permissions.query) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = await navigator.permissions.query({ name: 'camera' as any });
      cameraStatus = status.state;
    } catch {
      cameraStatus = 'prompt';
    }
  }

  const wakeLockSupported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

  return {
    notifications: notifStatus,
    camera: cameraStatus,
    audioUnlocked: isAudioUnlocked,
    wakeLockSupported,
    wakeLockActive: !!wakeLockSentinel,
    backgroundKeepAliveActive: !!silentAudioElement && !silentAudioElement.paused,
  };
}
