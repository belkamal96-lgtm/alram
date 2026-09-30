import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  BellRing,
  Smile,
  Sparkles,
  Volume2,
  Upload,
  Image as ImageIcon,
  FolderOpen,
} from 'lucide-react';
import { Alarm, WakeUpLogEntry } from '../types/alarm';
import { getNepaliTimeInfo } from '../utils/nepaliTime';
import { stopAllAlarmSounds } from '../utils/audioSynthesizer';
import { saveWakeUpLog } from '../utils/indexedDB';

interface PhotoWakeUpModalProps {
  alarm: Alarm;
  onDismiss: () => void;
  initialMode?: 'upload' | 'camera';
}

export const PhotoWakeUpModal: React.FC<PhotoWakeUpModalProps> = ({
  alarm,
  onDismiss,
  initialMode = 'camera',
}) => {
  const [activeMode, setActiveMode] = useState<'upload' | 'camera'>(initialMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [faceCheckStatus, setFaceCheckStatus] = useState<
    'checking' | 'detected' | 'not_detected'
  >('checking');
  const [dismissedSuccess, setDismissedSuccess] = useState(false);
  const [wakeUpTimeStr, setWakeUpTimeStr] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const detectionIntervalRef = useRef<number | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);

  // Start Nepal time string and vibration
  useEffect(() => {
    const npt = getNepaliTimeInfo();
    setWakeUpTimeStr(npt.time12);

    // Vibration pattern
    if ('vibrate' in navigator && alarm.vibrate) {
      navigator.vibrate([600, 300, 600, 300, 800]);
      vibrationIntervalRef.current = window.setInterval(() => {
        navigator.vibrate([600, 300, 600, 300, 800]);
      }, 3000);
    }

    if (initialMode === 'camera') {
      startCamera();
    } else {
      // Auto open upload picker if requested
      setTimeout(() => {
        galleryInputRef.current?.click();
      }, 300);
    }

    return () => {
      stopCamera();
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, [initialMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          startFaceTracking();
        };
      }
    } catch (err: unknown) {
      console.warn('Camera stream error:', err);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('Permission') || errorMsg.includes('denied')) {
        setCameraError(
          'Camera access not allowed. You can upload any photo or take one with your phone camera below.'
        );
      } else {
        setCameraError(
          'Live camera unavailable. Please upload a photo to turn off the alarm.'
        );
      }
      setCameraActive(false);
      // Auto switch to upload mode if camera fails
      setActiveMode('upload');
    }
  };

  const stopCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Real-time face detection / wake-up verification loop
  const startFaceTracking = () => {
    const hasNativeFaceDetector =
      typeof window !== 'undefined' && 'FaceDetector' in window;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeDetector = hasNativeFaceDetector
      ? new (window as any).FaceDetector({
          fastMode: true,
          maxDetectedFaces: 2,
        })
      : null;

    detectionIntervalRef.current = window.setInterval(async () => {
      if (!videoRef.current || !cameraActive || capturedPhoto) return;

      const video = videoRef.current;
      if (video.videoWidth === 0 || video.videoHeight === 0) return;

      if (nativeDetector) {
        try {
          const faces = await nativeDetector.detect(video);
          if (faces && faces.length > 0) {
            setIsFaceDetected(true);
            setFaceCheckStatus('detected');
            return;
          }
        } catch {
          // fallback to algorithmic analysis
        }
      }

      // Algorithmic frame analysis fallback
      try {
        const offscreen = document.createElement('canvas');
        offscreen.width = 80;
        offscreen.height = 80;
        const ctx = offscreen.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, 80, 80);
        const imgData = ctx.getImageData(15, 15, 50, 50);
        const data = imgData.data;

        let totalBrightness = 0;
        let variation = 0;
        let prevLuma = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luma = 0.299 * r + 0.587 * g + 0.114 * b;
          totalBrightness += luma;
          if (i > 0) variation += Math.abs(luma - prevLuma);
          prevLuma = luma;
        }

        const avgBrightness = totalBrightness / (data.length / 4);

        if (avgBrightness > 25 && variation > 800) {
          setIsFaceDetected(true);
          setFaceCheckStatus('detected');
        } else {
          setFaceCheckStatus('not_detected');
        }
      } catch {
        // Ignore canvas read errors
      }
    }, 600);
  };

  // Capture photo from live video feed
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw video frame (mirror horizontal for natural selfie feel)
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Reset transform for watermark overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Stamp watermark
    stampWatermark(ctx, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  // Handle photo from file upload or native camera
  const handleFileCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, 800);
        canvas.height = Math.round(canvas.width * (img.height / img.width));
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        stampWatermark(ctx, canvas.width, canvas.height);

        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.85));
        stopCamera();
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const stampWatermark = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    const npt = getNepaliTimeInfo();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, height - 70, width, 70);

    ctx.fillStyle = '#f59e0b'; // Amber
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`☀️ AWAKE: ${npt.time12} NPT`, 20, height - 40);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText(
      `${npt.dateBS.formattedNepali} • ${alarm.label || 'Morning Alarm'}`,
      20,
      height - 18
    );
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setIsFaceDetected(false);
    if (activeMode === 'camera') {
      startCamera();
    }
  };

  // THE OK BUTTON: Stops alarm ringing and saves record
  const handleConfirmOkAndStopAlarm = async () => {
    if (!capturedPhoto) return;

    // 1. STOP THE ALARM RINGING & VIBRATION!
    stopAllAlarmSounds();
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
    }
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }

    // 2. Save record to Wake-Up History
    const npt = getNepaliTimeInfo();
    const logEntry: WakeUpLogEntry = {
      id: `wakeup_${Date.now()}`,
      alarmId: alarm.id,
      alarmLabel: alarm.label || 'Wake Up Alarm',
      alarmTimeNPT: alarm.time,
      actualWakeUpTimeNPT: npt.time12,
      dateBS: npt.dateBS.formattedNepali,
      dateGregorian: npt.gregorianDateString,
      photoDataUrl: capturedPhoto,
      timestamp: Date.now(),
    };

    try {
      await saveWakeUpLog(logEntry);
    } catch (err) {
      console.warn('Failed to save wake-up log:', err);
    }

    setDismissedSuccess(true);

    // Complete dismissal after celebration
    setTimeout(() => {
      onDismiss();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 p-3 sm:p-6 overflow-y-auto">
      {/* Background Animated Pulse Rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-amber-500/10 blur-3xl animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full border border-amber-500/20 animate-ping opacity-25" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/40 shadow-2xl shadow-amber-500/20 p-5 sm:p-6 text-center text-white my-auto animate-in zoom-in-95">
        {/* Success Screen after tapping OK */}
        {dismissedSuccess ? (
          <div className="py-10 space-y-4 animate-in fade-in zoom-in">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-white">Good Morning!</h2>
              <p className="text-sm text-emerald-300 font-semibold">
                Alarm Turned Off • Wake-Up Verified!
              </p>
              <p className="text-xs text-slate-400 pt-1">
                Photo verified at {wakeUpTimeStr} NPT.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-amber-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Saved to Wake-Up Gallery</span>
            </div>
          </div>
        ) : (
          <>
            {/* Alarm Ringing Header */}
            <div className="space-y-2 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-bold tracking-wide uppercase animate-pulse">
                <BellRing className="w-3.5 h-3.5" />
                <span>Ringing Now • Nepali Time</span>
              </div>

              <div>
                <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white font-mono">
                  {alarm.time}{' '}
                  <span className="text-xl sm:text-2xl text-amber-400">NPT</span>
                </p>
                <p className="text-sm font-semibold text-slate-300 mt-1">
                  {alarm.label || 'Wake Up Alarm'}
                </p>
              </div>

              {/* Mode Switcher Tabs */}
              {!capturedPhoto && (
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    onClick={() => {
                      setActiveMode('upload');
                      stopCamera();
                      galleryInputRef.current?.click();
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      activeMode === 'upload'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveMode('camera');
                      startCamera();
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      activeMode === 'camera'
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Live Camera</span>
                  </button>
                </div>
              )}
            </div>

            {/* Photo Preview / Live Camera / Upload Zone */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
              {capturedPhoto ? (
                // Captured/Uploaded Photo Preview
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Captured wake up photo"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Photo Verified!</span>
                  </div>
                </div>
              ) : activeMode === 'upload' ? (
                // Direct Photo Upload Card (Works everywhere, even when locked / lockscreen)
                <div
                  onClick={() => galleryInputRef.current?.click()}
                  className="w-full h-full p-6 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-900 to-slate-950 cursor-pointer hover:bg-slate-900/90 transition group border-2 border-dashed border-amber-500/40 rounded-2xl"
                >
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/15 group-hover:bg-amber-500/25 text-amber-400 flex items-center justify-center transition shadow-lg">
                    <FolderOpen className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-white group-hover:text-amber-300 transition">
                      Tap to Upload Photo
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                      Choose any photo from your gallery or files to turn off the alarm
                    </p>
                  </div>
                  <span className="mt-1 px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-bold text-xs shadow-md">
                    Choose Photo
                  </span>
                </div>
              ) : cameraActive ? (
                // Live Camera View
                <div className="relative w-full h-full">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />

                  {/* Face Guide Oval */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-6">
                    <div
                      className={`w-48 h-60 rounded-[50%] border-2 transition-all duration-300 flex flex-col items-center justify-between p-3 ${
                        faceCheckStatus === 'detected'
                          ? 'border-emerald-400 shadow-lg shadow-emerald-500/30 bg-emerald-500/5'
                          : 'border-amber-400/80 border-dashed animate-pulse'
                      }`}
                    >
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 text-amber-300">
                        {faceCheckStatus === 'detected'
                          ? 'Face Centered ✓'
                          : 'Position Face Here'}
                      </span>
                      <Smile
                        className={`w-8 h-8 transition ${
                          faceCheckStatus === 'detected'
                            ? 'text-emerald-400 scale-110'
                            : 'text-amber-400/50'
                        }`}
                      />
                      <span className="text-[9px] font-medium text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-full">
                        {faceCheckStatus === 'detected'
                          ? 'Ready to snap!'
                          : 'Open eyes wide'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Fallback if camera stream failed
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Camera Preview</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      {cameraError ||
                        'Tap Upload Photo to choose any picture and turn off the alarm.'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveMode('upload');
                      galleryInputRef.current?.click();
                    }}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                  >
                    Upload Photo Instead
                  </button>
                </div>
              )}

              {/* Sound Ringing Indicator in corner */}
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-bounce" />
                <span>Ringing</span>
              </div>
            </div>

            {/* Hidden Inputs for File Selection & Mobile Native Camera */}
            <input
              type="file"
              ref={galleryInputRef}
              accept="image/*"
              onChange={handleFileCapture}
              className="hidden"
            />
            <input
              type="file"
              ref={nativeCameraInputRef}
              accept="image/*"
              capture="user"
              onChange={handleFileCapture}
              className="hidden"
            />

            {/* Actions Section */}
            <div className="mt-5 space-y-3">
              {capturedPhoto ? (
                // Photo Taken / Uploaded State -> USER MUST TAP OK TO STOP RINGING!
                <div className="space-y-2">
                  <button
                    onClick={handleConfirmOkAndStopAlarm}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-extrabold text-lg flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/30 transition transform active:scale-95 cursor-pointer"
                  >
                    <CheckCircle2 className="w-6 h-6" />
                    <span>OK — Stop Alarm & I'm Awake!</span>
                  </button>

                  <button
                    onClick={handleRetake}
                    className="w-full py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake / Choose Another Photo</span>
                  </button>
                </div>
              ) : (
                // Photo Not Selected Yet -> Primary Buttons
                <div className="space-y-2">
                  {/* Big Upload Photo Button */}
                  <button
                    onClick={() => {
                      setActiveMode('upload');
                      galleryInputRef.current?.click();
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer"
                  >
                    <Upload className="w-5 h-5" />
                    <span>Upload Photo to Stop Alarm</span>
                  </button>

                  {/* Secondary Camera Snap Button */}
                  <div className="flex items-center gap-2">
                    {cameraActive ? (
                      <button
                        onClick={handleSnapPhoto}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Snap Live Selfie</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => nativeCameraInputRef.current?.click()}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-amber-400" />
                        <span>Take Phone Photo</span>
                      </button>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-400 pt-1">
                    Song:{' '}
                    <span className="text-amber-300 font-medium">
                      {alarm.soundName || 'Nepali Flute'}
                    </span>{' '}
                    • Alarm will keep ringing until you upload or take a photo and tap OK
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
