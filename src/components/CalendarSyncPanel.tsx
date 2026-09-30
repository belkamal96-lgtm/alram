import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  LogOut,
  RefreshCw,
  Trash2,
  Plus,
  AlertCircle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  logout,
  getAccessToken,
  initAuth,
} from '../services/firebaseAuth';
import {
  CalendarEvent,
  getUpcomingCalendarEvents,
  deleteCalendarEvent,
} from '../services/calendarService';
import { Alarm } from '../types/alarm';

interface CalendarSyncPanelProps {
  alarms: Alarm[];
  onSyncAlarmToCalendar: (alarm: Alarm) => Promise<void>;
}

export const CalendarSyncPanel: React.FC<CalendarSyncPanelProps> = ({
  alarms,
  onSyncAlarmToCalendar,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [syncingAlarmId, setSyncingAlarmId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Deletion confirmation state
  const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        fetchEvents();
      },
      () => {
        setUser(null);
        setToken(null);
        setEvents([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        await fetchEvents();
      }
    } catch (err: unknown) {
      console.error('Sign-in error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Sign-in failed: ${msg}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setEvents([]);
  };

  const fetchEvents = async () => {
    setLoadingEvents(true);
    setStatusMessage(null);
    try {
      const list = await getUpcomingCalendarEvents();
      setEvents(list);
    } catch (err) {
      console.warn('Failed to load events:', err);
    } finally {
      setLoadingEvents(false);
    }
  };

  const handleSyncAlarm = async (alarm: Alarm) => {
    setSyncingAlarmId(alarm.id);
    setStatusMessage(null);
    try {
      await onSyncAlarmToCalendar(alarm);
      setStatusMessage(`Synced "${alarm.label || 'Alarm'}" to Google Calendar!`);
      await fetchEvents();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Sync error: ${msg}`);
    } finally {
      setSyncingAlarmId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!eventToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCalendarEvent(eventToDelete.id);
      setEvents((prev) => prev.filter((e) => e.id !== eventToDelete.id));
      setEventToDelete(null);
      setStatusMessage('Event removed from your Google Calendar.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage(`Delete error: ${msg}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Status Card */}
      <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/15 text-blue-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Google Calendar Integration</h3>
              <p className="text-xs text-slate-400">
                Sync Nepali alarms with your Google account
              </p>
            </div>
          </div>

          {user && (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

        {!user ? (
          <div className="pt-2 text-center space-y-3">
            <p className="text-xs text-slate-400">
              Sign in with Google to automatically add wake-up events to your primary calendar with Nepal Time (UTC+05:45).
            </p>

            {/* Official Google Sign-In Button */}
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="gsi-material-button w-full sm:w-auto mx-auto shadow-md hover:shadow-lg transition cursor-pointer"
            >
              <div className="gsi-material-button-state"></div>
              <div className="gsi-material-button-content-wrapper">
                <div className="gsi-material-button-icon">
                  <svg
                    version="1.1"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 48 48"
                    style={{ display: 'block' }}
                  >
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    ></path>
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    ></path>
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    ></path>
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    ></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                  </svg>
                </div>
                <span className="gsi-material-button-contents font-medium text-slate-800">
                  {isLoggingIn ? 'Connecting to Google...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'Google User'}
                className="w-9 h-9 rounded-full border border-slate-600"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center">
                {user.email?.[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {user.displayName || 'Connected User'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            </div>
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
              <CheckCircle2 className="w-3 h-3" />
              <span>Connected</span>
            </div>
          </div>
        )}

        {statusMessage && (
          <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
            {statusMessage}
          </p>
        )}
      </div>

      {/* Sync Your Alarms List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Sync Alarms to Google Calendar
        </h4>

        {alarms.length === 0 ? (
          <p className="text-xs text-slate-500">No alarms configured yet.</p>
        ) : (
          <div className="space-y-2">
            {alarms.map((alarm) => (
              <div
                key={alarm.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 border border-slate-800"
              >
                <div>
                  <p className="text-sm font-bold text-white font-mono">
                    {alarm.time} <span className="text-xs text-amber-400">NPT</span>
                  </p>
                  <p className="text-xs text-slate-400">
                    {alarm.label || 'Wake Up Alarm'}
                  </p>
                </div>

                <button
                  onClick={() => handleSyncAlarm(alarm)}
                  disabled={!user || syncingAlarmId === alarm.id}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    {syncingAlarmId === alarm.id ? 'Syncing...' : 'Sync to Calendar'}
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Google Calendar Events */}
      {user && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Upcoming Calendar Events
            </h4>
            <button
              onClick={fetchEvents}
              disabled={loadingEvents}
              className="text-xs text-sky-400 hover:underline flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${loadingEvents ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {events.length === 0 ? (
            <p className="text-xs text-slate-500">No upcoming events found on primary calendar.</p>
          ) : (
            <div className="space-y-2">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="flex items-start justify-between p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate">{evt.summary}</p>
                    <p className="text-[11px] text-slate-400">
                      {evt.start.dateTime
                        ? new Date(evt.start.dateTime).toLocaleString([], {
                            weekday: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : evt.start.date}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {evt.htmlLink && (
                      <a
                        href={evt.htmlLink}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                        title="Open in Google Calendar"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => setEventToDelete(evt)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition"
                      title="Delete event"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Destructive Operation */}
      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="w-11 h-11 rounded-2xl bg-red-500/15 text-red-400 flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-white">Delete Calendar Event?</h3>
              <p className="text-xs text-slate-300 mt-1">
                Are you sure you want to remove <strong>"{eventToDelete.summary}"</strong> from your Google Calendar? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setEventToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/20"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
