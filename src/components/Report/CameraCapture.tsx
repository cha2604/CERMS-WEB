import { useRef, useState, useCallback, useEffect } from "react";
import { FiCamera, FiX, FiCheck } from "react-icons/fi";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose?: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [captured, setCaptured] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: "continuous",
          },
        });
        if (cancelled) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.setAttribute("playsinline", "true");
        }
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleVideoLoaded = useCallback(() => {
    setVideoReady(true);
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!videoReady || video.videoWidth === 0) {
      setError("Camera not ready yet. Please wait a moment.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Add timestamp to the photo
    const now = new Date();
    const timestamp = now.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const fontSize = Math.max(16, Math.floor(canvas.width / 40));
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillText(timestamp, canvas.width - 20, canvas.height - 20);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `capture_${Date.now()}.jpg`, {
        type: "image/jpeg",
      });

      onCapture(file);
      setCaptured(true);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      setTimeout(() => {
        setCaptured(false);
        onClose?.();
      }, 1200);
    }, "image/jpeg", 0.9);
  }, [onCapture, onClose, videoReady]);

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="relative w-full h-full flex flex-col">
        <div className="flex items-center justify-between p-3 bg-black/80">
          <h3 className="text-sm font-extrabold text-white">Camera</h3>
          <button
            type="button"
            onClick={() => {
              if (streamRef.current) {
                streamRef.current.getTracks().forEach((t) => t.stop());
              }
              onClose?.();
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg text-white transition-all"
          >
            <FiX size={20} />
          </button>
        </div>

        {error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl text-center max-w-sm">
              {error}
            </div>
          </div>
        ) : (
          <div className="flex-1 relative bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={handleVideoLoaded}
              className="w-full h-full object-cover"
              style={{ imageRendering: "auto" }}
            />
            <canvas ref={canvasRef} className="hidden" />
          </div>
        )}

        <div className="p-4 bg-black/80 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleCapture}
            disabled={!!error || captured}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-sm rounded-xl transition-all shadow-lg"
          >
            {captured ? (
              <>
                <FiCheck size={20} />
                Captured!
              </>
            ) : (
              <>
                <FiCamera size={20} />
                Take Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
