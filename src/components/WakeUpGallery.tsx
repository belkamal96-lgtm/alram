import React, { useEffect, useState } from 'react';
import {
  Camera,
  Calendar,
  Clock,
  Sparkles,
  Trash2,
  X,
  Flame,
  Award,
  Download,
} from 'lucide-react';
import { WakeUpLogEntry } from '../types/alarm';
import { getAllWakeUpLogs, deleteWakeUpLog } from '../utils/indexedDB';

export const WakeUpGallery: React.FC = () => {
  const [logs, setLogs] = useState<WakeUpLogEntry[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<WakeUpLogEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getAllWakeUpLogs();
      setLogs(data);
    } catch (err) {
      console.error('Failed to load wake-up logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this wake-up photo from your gallery?')) {
      await deleteWakeUpLog(id);
      if (selectedPhoto?.id === id) {
        setSelectedPhoto(null);
      }
      await loadLogs();
    }
  };

  // Compute streak (unique calendar days)
  const uniqueDays = new Set(
    logs.map((l) => new Date(l.timestamp).toDateString())
  ).size;

  return (
    <div className="space-y-6">
      {/* Streak & Achievement Header */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30">
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Flame className="w-5 h-5 fill-amber-400 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Wake-Up Streak
            </span>
          </div>
          <p className="text-3xl font-black text-white">{uniqueDays} <span className="text-sm font-semibold text-amber-300">Days</span></p>
          <p className="text-[11px] text-slate-400 mt-0.5">Consecutive selfie wake-ups</p>
        </div>

        <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-transparent border border-emerald-500/30">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Award className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Photo Verified
            </span>
          </div>
          <p className="text-3xl font-black text-white">{logs.length} <span className="text-sm font-semibold text-emerald-300">Missions</span></p>
          <p className="text-[11px] text-slate-400 mt-0.5">Beaten the alarm</p>
        </div>
      </div>

      {/* Gallery Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-amber-400" />
            <span>Morning Selfie History</span>
          </h3>
          <span className="text-xs text-slate-400">{logs.length} records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading gallery...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 rounded-3xl bg-slate-900/50 border border-slate-800 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">No Wake-Up Selfies Yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                When your alarm rings, snap your photo to stop it. Your morning proof selfies will appear here!
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {logs.map((log) => (
              <div
                key={log.id}
                onClick={() => setSelectedPhoto(log)}
                className="group relative aspect-square rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 hover:border-amber-500/50 transition cursor-pointer shadow-lg"
              >
                <img
                  src={log.photoDataUrl}
                  alt={log.alarmLabel}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-90 p-2.5 flex flex-col justify-end text-white">
                  <p className="text-xs font-bold truncate text-amber-300">
                    {log.actualWakeUpTimeNPT || log.alarmTimeNPT}
                  </p>
                  <p className="text-[10px] text-slate-300 truncate">
                    {log.dateBS || log.dateGregorian}
                  </p>
                </div>

                <button
                  onClick={(e) => handleDelete(log.id, e)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-950/70 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Full Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-sm w-full rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <p className="text-sm font-bold text-white">Wake-Up Selfie</p>
                <p className="text-xs text-amber-400">
                  {selectedPhoto.actualWakeUpTimeNPT} NPT
                </p>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-square w-full bg-slate-950">
              <img
                src={selectedPhoto.photoDataUrl}
                alt="Wake up selfie full"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="p-4 space-y-2 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Alarm:</span>
                <span className="font-semibold text-white">
                  {selectedPhoto.alarmLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date (Bikram Sambat):</span>
                <span className="font-semibold text-white">
                  {selectedPhoto.dateBS}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date (Gregorian):</span>
                <span>{selectedPhoto.dateGregorian}</span>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href={selectedPhoto.photoDataUrl}
                  download={`wakeup-${selectedPhoto.id}.jpg`}
                  className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-center text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Photo</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
