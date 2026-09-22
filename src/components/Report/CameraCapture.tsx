import { useRef, useState, useCallback, useEffect } from "react";
import { FiCamera, FiX, FiCheck } from "react-icons/fi";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose?: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not access camera. Please ensure camera permissions are granted."
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [stream]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `capture_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      onCapture(file);
      setCaptured(true);

      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }

      setTimeout(() => {
        setCaptured(false);
        onClose?.();
      }, 1200);
    }, "image/jpeg", 0.9);
  }, [onCapture, onClose, stream]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-4 max-w-md w-full space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-slate-900">Camera</h3>
          <button
            type="button"
            onClick={() => {
              if (stream) {
                stream.getTracks().forEach((t) => t.stop());
              }
              onClose?.();
            }}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-700 transition-all"
          >
            <FiX size={18} />
          </button>
        </div>

        {error ? (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        ) : (
          <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!!error || captured}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all"
          >
            {captured ? (
              <>
                <FiCheck size={16} />
                Captured!
              </>
            ) : (
              <>
                <FiCamera size={16} />
                Take Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
