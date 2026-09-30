import React, { useEffect, useState, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Square,
  Upload,
  Music,
  Trash2,
  Check,
  X,
  Sparkles,
  Disc,
} from 'lucide-react';
import { CustomSoundRecord, SoundOption } from '../types/alarm';
import {
  getAllCustomSounds,
  saveCustomSound,
  deleteCustomSound,
} from '../utils/indexedDB';
import { previewSound, stopAllAlarmSounds } from '../utils/audioSynthesizer';

const BUILT_IN_SOUNDS: SoundOption[] = [
  {
    id: 'nepali_flute',
    name: 'Himalayan Morning Flute (Bansuri)',
    category: 'builtin',
    description: 'Serene, peaceful morning raga melody inspired by Nepali mountain dawn.',
  },
  {
    id: 'twin_bell',
    name: 'Twin Bell Alarm Clock',
    category: 'builtin',
    description: 'Classic rapid dual-bell mechanical alarm clock. High urgency.',
  },
  {
    id: 'digital_chirp',
    name: 'Digital Tri-Pulse Beep',
    category: 'builtin',
    description: 'Energetic electronic pulses that wake up the heaviest sleepers.',
  },
  {
    id: 'temple_singing_bowl',
    name: 'Tibetan Singing Bowl & Bells',
    category: 'builtin',
    description: 'Harmonic resonant overtone bell for mindful, peaceful awakening.',
  },
  {
    id: 'rooster_morning',
    name: 'Morning Rooster Fanfare',
    category: 'builtin',
    description: 'Upbeat and bright early morning village wake-up tune.',
  },
  {
    id: 'sunrise_siren',
    name: 'Sunrise Urgent Siren',
    category: 'builtin',
    description: 'Pitch-sweeping urgent alarm designed to prevent oversleeping.',
  },
];

interface SoundSelectorModalProps {
  isOpen: boolean;
  selectedSoundId: string;
  onSelectSound: (soundId: string, soundName: string) => void;
  onClose: () => void;
}

export const SoundSelectorModal: React.FC<SoundSelectorModalProps> = ({
  isOpen,
  selectedSoundId,
  onSelectSound,
  onClose,
}) => {
  const [customSounds, setCustomSounds] = useState<CustomSoundRecord[]>([]);
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomSounds();
    } else {
      stopAllAlarmSounds();
      setPlayingSoundId(null);
    }
  }, [isOpen]);

  const loadCustomSounds = async () => {
    try {
      const sounds = await getAllCustomSounds();
      setCustomSounds(sounds);
    } catch (err) {
      console.error('Failed to load custom sounds:', err);
    }
  };

  const handlePreview = async (soundId: string) => {
    if (playingSoundId === soundId) {
      stopAllAlarmSounds();
      setPlayingSoundId(null);
    } else {
      stopAllAlarmSounds();
      setPlayingSoundId(soundId);
      await previewSound(soundId, 85);
      // Auto-reset playing indicator after preview duration
      setTimeout(() => {
        setPlayingSoundId((curr) => (curr === soundId ? null : curr));
      }, 4500);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset error
    setUploadError(null);
    setIsUploading(true);

    try {
      // Validate file size (max 25MB for offline storage)
      if (file.size > 25 * 1024 * 1024) {
        setUploadError('File is too large. Please select an audio file under 25MB.');
        setIsUploading(false);
        return;
      }

      const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // Clean up display name
      const name = file.name.replace(/\.[^/.]+$/, '').slice(0, 40);

      const record: CustomSoundRecord = {
        id,
        name,
        size: file.size,
        mimeType: file.type || 'audio/mpeg',
        createdAt: Date.now(),
        audioBlob: file,
      };

      await saveCustomSound(record);
      await loadCustomSounds();

      // Automatically select newly uploaded sound
      onSelectSound(id, name);
    } catch (err) {
      console.error('Failed to save custom audio:', err);
      setUploadError('Failed to import audio file. Please try another track.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteCustomSound = async (id: string, name: string) => {
    if (confirm(`Remove "${name}" from your stored alarm songs?`)) {
      if (playingSoundId === id) {
        stopAllAlarmSounds();
        setPlayingSoundId(null);
      }
      await deleteCustomSound(id);
      await loadCustomSounds();
      // If the deleted sound was selected, fallback to default
      if (selectedSoundId === id) {
        onSelectSound('nepali_flute', 'Himalayan Morning Flute (Bansuri)');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-4">
      <div className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Music className="w-5 h-5 text-amber-400" />
              <span>Select Alarm Song</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Choose built-in Nepali tones or import custom songs from your device
            </p>
          </div>
          <button
            onClick={() => {
              stopAllAlarmSounds();
              onClose();
            }}
            className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Custom Music Upload Section */}
          <div className="rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Disc className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-white">Import Device Music</span>
              </div>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                Custom Music
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Upload your favorite song (MP3, WAV, AAC, M4A, OGG) from phone storage to wake up to.
            </p>

            <input
              type="file"
              ref={fileInputRef}
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 transition cursor-pointer disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{isUploading ? 'Importing Audio...' : 'Choose Music File from Device'}</span>
            </button>

            {uploadError && (
              <p className="text-xs text-red-400 mt-2 font-medium">{uploadError}</p>
            )}

            {/* List of uploaded custom songs */}
            {customSounds.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                <p className="text-xs font-medium text-slate-400">My Imported Songs ({customSounds.length})</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {customSounds.map((sound) => {
                    const isSelected = selectedSoundId === sound.id;
                    const isPlaying = playingSoundId === sound.id;

                    return (
                      <div
                        key={sound.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition ${
                          isSelected
                            ? 'bg-amber-500/15 border-amber-500/50 text-white'
                            : 'bg-slate-800/60 border-slate-800 hover:border-slate-700 text-slate-300'
                        }`}
                      >
                        <div
                          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                          onClick={() => {
                            onSelectSound(sound.id, sound.name);
                          }}
                        >
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Music className="w-3.5 h-3.5" />}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold truncate text-white">{sound.name}</p>
                            <p className="text-[10px] text-slate-400">
                              {(sound.size / (1024 * 1024)).toFixed(1)} MB • Custom Audio
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 ml-2">
                          <button
                            onClick={() => handlePreview(sound.id)}
                            className={`p-1.5 rounded-lg transition ${
                              isPlaying
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            }`}
                            title={isPlaying ? 'Stop' : 'Preview'}
                          >
                            {isPlaying ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                          </button>
                          <button
                            onClick={() => handleDeleteCustomSound(sound.id, sound.name)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Built-in Synthesizer Alarm Tones */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Built-in Tones (Zero Internet Required)
              </span>
            </div>

            <div className="space-y-2">
              {BUILT_IN_SOUNDS.map((sound) => {
                const isSelected = selectedSoundId === sound.id;
                const isPlaying = playingSoundId === sound.id;

                return (
                  <div
                    key={sound.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition ${
                      isSelected
                        ? 'bg-amber-500/10 border-amber-500/60 shadow-lg shadow-amber-500/5'
                        : 'bg-slate-800/40 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="flex items-start gap-3 flex-1 min-w-0 cursor-pointer"
                      onClick={() => onSelectSound(sound.id, sound.name)}
                    >
                      <div
                        className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 shadow-md'
                            : 'border-2 border-slate-600'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white truncate">{sound.name}</p>
                          {sound.id === 'nepali_flute' && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                              Popular
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {sound.description}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handlePreview(sound.id)}
                      className={`p-2 rounded-xl shrink-0 transition ${
                        isPlaying
                          ? 'bg-amber-500 text-slate-950 scale-105'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700'
                      }`}
                      title={isPlaying ? 'Stop' : 'Listen'}
                    >
                      {isPlaying ? (
                        <Square className="w-4 h-4 fill-current" />
                      ) : (
                        <Play className="w-4 h-4 fill-current" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              stopAllAlarmSounds();
              onClose();
            }}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};
