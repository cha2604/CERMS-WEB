
import {
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  FiCamera,
  FiX,
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose?: () => void;
}

export default function CameraCapture({
  onCapture,
  onClose,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [error, setError] = useState("");
  const [videoReady, setVideoReady] = useState(false);
  const [starting, setStarting] = useState(true);
  const [captured, setCaptured] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => {
      track.stop();
    });

    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeCamera = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    stopCamera();
    onClose?.();
  }, [onClose, stopCamera]);

  useEffect(() => {
    let cancelled = false;

    async function startCamera() {
      setStarting(true);
      setVideoReady(false);
      setError("");
      setCaptured(false);

      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error(
            "Camera access requires HTTPS or localhost. Please check your browser connection."
          );
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1080,
            },
            height: {
              ideal: 1920,
            },
            aspectRatio: {
              ideal: 9 / 16,
            },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const video = videoRef.current;

        if (!video) {
          throw new Error("Camera preview could not be initialized.");
        }

        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;

        await video.play();

        if (!cancelled) {
          setStarting(false);

          if (video.videoWidth > 0 && video.videoHeight > 0) {
            setVideoReady(true);
          }
        }
      } catch (cameraError) {
        if (cancelled) return;

        stopCamera();

        setError(
          cameraError instanceof Error
            ? cameraError.message
            : "Unable to access the camera."
        );

        setStarting(false);
      }
    }

    void startCamera();

    return () => {
      cancelled = true;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      stopCamera();
    };
  }, [retryCount, stopCamera]);

  const handleVideoReady = useCallback(() => {
    const video = videoRef.current;

    if (
      video &&
      video.videoWidth > 0 &&
      video.videoHeight > 0
    ) {
      setVideoReady(true);
      setStarting(false);
    }
  }, []);

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const preview = previewRef.current;

    if (!video || !canvas || !preview || !videoReady) {
      setError("Please wait until the camera is ready.");
      return;
    }

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    const previewAspect =
      preview.clientWidth / preview.clientHeight;

    const sourceAspect = sourceWidth / sourceHeight;

    let sx = 0;
    let sy = 0;
    let sw = sourceWidth;
    let sh = sourceHeight;

    if (sourceAspect > previewAspect) {
      sw = sourceHeight * previewAspect;
      sx = (sourceWidth - sw) / 2;
    } else {
      sh = sourceWidth / previewAspect;
      sy = (sourceHeight - sh) / 2;
    }

    canvas.width = Math.round(sw);
    canvas.height = Math.round(sh);

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      setError("Unable to process the captured photo.");
      return;
    }

    ctx.drawImage(
      video,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const timestamp = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    const fontSize = Math.max(
      16,
      Math.floor(canvas.width / 40)
    );

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = "white";
    ctx.textAlign = "right";
    ctx.shadowColor = "black";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillText(
      timestamp,
      canvas.width - 20,
      canvas.height - 20
    );

    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Unable to save the captured photo.");
          return;
        }

        const file = new File(
          [blob],
          `capture_${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        onCapture(file);
        setCaptured(true);
        stopCamera();

        timerRef.current = setTimeout(() => {
          onClose?.();
        }, 1000);
      },
      "image/jpeg",
      0.9
    );
  }, [onCapture, onClose, stopCamera, videoReady]);

  const retryCamera = () => {
    stopCamera();
    setError("");
    setStarting(true);
    setVideoReady(false);
    setRetryCount((current) => current + 1);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] grid w-screen overflow-hidden bg-black"
      style={{
        height: "100dvh",
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        boxSizing: "border-box",
      }}
    >
      <header className="relative z-20 flex min-h-[58px] shrink-0 items-center justify-between border-b border-white/10 bg-[#111111] px-5 py-3">
        <div>
          <h3 className="text-base font-extrabold text-white">
            Camera
          </h3>

          <p className="mt-0.5 text-[10px] text-white/50">
            Capture the actual waste concern
          </p>
        </div>

        <button
          type="button"
          onClick={closeCamera}
          aria-label="Close camera"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <FiX size={22} />
        </button>
      </header>

      <main
        ref={previewRef}
        className="relative min-h-0 w-full overflow-hidden bg-black"
      >
        {!error && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={handleVideoReady}
            onCanPlay={handleVideoReady}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}

        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {starting && !error && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70">
            <FiRefreshCw
              size={30}
              className="animate-spin text-white"
            />

            <p className="text-sm font-bold text-white">
              Starting camera...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black p-5">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
              <FiCamera
                size={30}
                className="mx-auto text-rose-600"
              />

              <h4 className="mt-3 font-black text-slate-900">
                Camera Unavailable
              </h4>

              <p className="mt-2 text-xs leading-relaxed text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={retryCamera}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 text-sm font-bold text-white"
              >
                <FiRefreshCw size={16} />
                Retry Camera
              </button>
            </div>
          </div>
        )}

        {videoReady && !captured && (
          <div className="pointer-events-none absolute bottom-5 left-0 right-0 flex justify-center px-4">
            <span className="rounded-full border border-white/20 bg-black/50 px-4 py-2 text-[10px] font-bold text-white shadow-lg backdrop-blur-sm">
              Position the waste concern inside the camera view
            </span>
          </div>
        )}
      </main>

      <footer className="relative z-30 flex min-h-[120px] shrink-0 flex-col items-center justify-center gap-2 border-t border-white/10 bg-[#111111] px-5 py-4">
        {!captured && !error && (
          <>
            <button
              type="button"
              onClick={handleCapture}
              disabled={!videoReady || starting}
              className="flex min-h-[60px] w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 text-base font-extrabold text-white shadow-lg transition active:scale-95 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <FiCamera size={23} />
              {videoReady ? "CAPTURE PHOTO" : "PREPARING CAMERA"}
            </button>

            <p className="text-[10px] font-medium text-white/50">
              Tap the button to capture your photo
            </p>
          </>
        )}

        {captured && (
          <div className="flex min-h-[60px] w-full max-w-xs items-center justify-center gap-3 rounded-2xl bg-emerald-600 px-8 py-4 text-base font-extrabold text-white">
            <FiCheck size={23} />
            Photo Captured!
          </div>
        )}

        {error && (
          <button
            type="button"
            onClick={closeCamera}
            className="min-h-[54px] w-full max-w-xs rounded-2xl bg-white/10 px-6 py-3 text-sm font-extrabold text-white"
          >
            Close Camera
          </button>
        )}
      </footer>
    </div>
  );
}
