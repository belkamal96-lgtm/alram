import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  RefreshCw,
  BellRing,
  AlertTriangle,
  Smile,
  SunMedium,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Alarm, WakeUpLogEntry } from '../types/alarm';
import { getNepaliTimeInfo } from '../utils/nepaliTime';
import { stopAllAlarmSounds } from '../utils/audioSynthesizer';
import { saveWakeUpLog } from '../utils/indexedDB';

interface PhotoWakeUpModalProps {
  alarm: Alarm;
  onDismiss: () => void;
}

export const PhotoWakeUpModal: React.FC<PhotoWakeUpModalProps> = ({ alarm, onDismiss }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isFaceDetected, setIsFaceDetected] = useState(false);
  const [faceCheckStatus, setFaceCheckStatus] = useState<'checking' | 'detected' | 'not_detected'>('checking');
  const [dismissedSuccess, setDismissedSuccess] = useState(false);
  const [wakeUpTimeStr, setWakeUpTimeStr] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

    startCamera();

    return () => {
      stopCamera();
      if (vibrationIntervalRef.current) {
        clearInterval(vibrationIntervalRef.current);
      }
      if ('vibrate' in navigator) {
        navigator.vibrate(0);
      }
    };
  }, []);

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
        setCameraError('Camera access was denied. You can take a photo using the photo capture button below.');
      } else {
        setCameraError('Unable to access front camera directly. Please use the camera snap button.');
      }
      setCameraActive(false);
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
    // Check if Experimental Shape Detection FaceDetector is supported
    const hasNativeFaceDetector = typeof window !== 'undefined' && 'FaceDetector' in window;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nativeDetector = hasNativeFaceDetector ? new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 2 }) : null;

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
          // fallback to algorithmic frame analysis
        }
      }

      // Algorithmic Face & Brightness Analysis Fallback:
      // Analyzes center oval area of video to ensure user is positioned in front of the lens
      // and room is not pitch black or lens blocked
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

        // A valid face in daylight/room lighting has reasonable brightness and variation (features)
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
    // Reset transform for text overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Stamp watermark
    const npt = getNepaliTimeInfo();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

    ctx.fillStyle = '#f59e0b'; // Amber
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`☀️ AWAKE: ${npt.time12} NPT`, 20, canvas.height - 40);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '14px sans-serif';
    ctx.fillText(`${npt.dateBS.formattedNepali} • ${alarm.label || 'Morning Alarm'}`, 20, canvas.height - 18);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  // Fallback file capture for devices with camera permissions issue
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

        const npt = getNepaliTimeInfo();
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.fillRect(0, canvas.height - 70, canvas.width, 70);

        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 22px sans-serif';
        ctx.fillText(`☀️ AWAKE: ${npt.time12} NPT`, 20, canvas.height - 40);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '14px sans-serif';
        ctx.fillText(`${npt.dateBS.formattedNepali} • ${alarm.label || 'Morning Alarm'}`, 20, canvas.height - 18);

        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setIsFaceDetected(false);
    startCamera();
  };

  // THE OK BUTTON: Only after tapping OK does the alarm ringing stop!
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

    // 2. Save selfie to Wake-Up History
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

    // Complete dismissal after celebration animation
    setTimeout(() => {
      onDismiss();
    }, 2200);
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
                You took your selfie and beat the sleep at {wakeUpTimeStr} NPT.
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
                  {alarm.time} <span className="text-xl sm:text-2xl text-amber-400">NPT</span>
                </p>
                <p className="text-sm font-semibold text-slate-300 mt-1">
                  {alarm.label || 'Wake Up Alarm'}
                </p>
              </div>

              <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
                <p className="font-semibold flex items-center justify-center gap-1.5">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>Wake-Up Photo Challenge</span>
                </p>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Alarm will <strong className="text-amber-300">not stop ringing</strong> until you take a selfie and tap <strong>OK</strong>!
                </p>
              </div>
            </div>

            {/* Camera Viewfinder or Photo Preview */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner flex items-center justify-center">
              {capturedPhoto ? (
                // Captured Photo Preview
                <div className="relative w-full h-full">
                  <img
                    src={capturedPhoto}
                    alt="Captured wake up selfie"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-emerald-600/90 text-white text-[11px] font-semibold flex items-center gap-1 shadow-md">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Selfie Ready!</span>
                  </div>
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
                        {faceCheckStatus === 'detected' ? 'Face Centered ✓' : 'Position Face Here'}
                      </span>
                      <Smile
                        className={`w-8 h-8 transition ${
                          faceCheckStatus === 'detected' ? 'text-emerald-400 scale-110' : 'text-amber-400/50'
                        }`}
                      />
                      <span className="text-[9px] font-medium text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-full">
                        {faceCheckStatus === 'detected' ? 'Eyes open!' : 'Open your eyes wide'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                // Fallback state if camera permissions are blocked
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-800 text-amber-400 mx-auto flex items-center justify-center">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Camera Preview</p>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
                      {cameraError || 'Tap button below to snap your wake-up photo directly.'}
                    </p>
                  </div>
                  <button
                    onClick={startCamera}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200"
                  >
                    Retry Live Camera
                  </button>
                </div>
              )}

              {/* Sound Ringing Indicator in corner */}
              <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-amber-400 text-[10px] font-semibold flex items-center gap-1">
                <Volume2 className="w-3 h-3 animate-bounce" />
                <span>Ringing</span>
              </div>
            </div>

            {/* Hidden Input for Mobile Native Camera Fallback */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="user"
              onChange={handleFileCapture}
              className="hidden"
            />

            {/* Actions Section */}
            <div className="mt-5 space-y-3">
              {capturedPhoto ? (
                // Photo Taken State -> USER MUST TAP OK TO STOP RINGING!
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
                    className="w-full py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Retake Photo</span>
                  </button>
                </div>
              ) : (
                // Photo Not Taken Yet -> Camera Snap Buttons
                <div className="space-y-2">
                  {cameraActive ? (
                    <button
                      onClick={handleSnapPhoto}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Take Photo to Stop Alarm</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition transform active:scale-95 cursor-pointer"
                    >
                      <Camera className="w-5 h-5" />
                      <span>Open Camera & Snap Photo</span>
                    </button>
                  )}

                  <p className="text-[11px] text-slate-400">
                    Song: <span className="text-amber-300 font-medium">{alarm.soundName || 'Nepali Flute'}</span> • Keeps ringing until OK is tapped
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
