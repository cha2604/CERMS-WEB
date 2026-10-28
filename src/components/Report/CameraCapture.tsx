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
} from "react-icons/fi";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onClose?: () => void;
}

export default function CameraCapture({
  onCapture,
  onClose,
}: CameraCaptureProps) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const [error, setError] =
    useState<string>("");

  const [
    captured,
    setCaptured,
  ] = useState(false);

  const [
    videoReady,
    setVideoReady,
  ] = useState(false);

  useEffect(() => {
    let cancelled =
      false;

    async function startCamera() {
      try {
        const mediaStream =
          await navigator.mediaDevices.getUserMedia(
            {
              video: {
                facingMode:
                  "environment",
                width: {
                  ideal: 1920,
                },
                height: {
                  ideal: 1080,
                },
              },
            }
          );

        if (cancelled) {
          mediaStream
            .getTracks()
            .forEach((track) =>
              track.stop()
            );

          return;
        }

        streamRef.current =
          mediaStream;

        if (
          videoRef.current
        ) {
          videoRef.current.srcObject =
            mediaStream;

          videoRef.current.setAttribute(
            "playsinline",
            "true"
          );
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
      cancelled =
        true;

      if (
        streamRef.current
      ) {
        streamRef.current
          .getTracks()
          .forEach((track) =>
            track.stop()
          );
      }
    };
  }, []);

  const handleVideoLoaded =
    useCallback(() => {
      setVideoReady(
        true
      );
    }, []);

  const handleCapture =
    useCallback(() => {
      const video =
        videoRef.current;

      const canvas =
        canvasRef.current;

      if (
        !video ||
        !canvas
      ) {
        return;
      }

      if (
        !videoReady ||
        video.videoWidth ===
          0
      ) {
        setError(
          "Camera not ready yet. Please wait a moment."
        );

        return;
      }

      canvas.width =
        video.videoWidth;

      canvas.height =
        video.videoHeight;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) {
        return;
      }

      ctx.drawImage(
        video,
        0,
        0
      );

      const now =
        new Date();

      const timestamp =
        now.toLocaleString(
          "en-US",
          {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true,
          }
        );

      const fontSize =
        Math.max(
          16,
          Math.floor(
            canvas.width /
              40
          )
        );

      ctx.font =
        `bold ${fontSize}px Arial`;

      ctx.fillStyle =
        "white";

      ctx.textAlign =
        "right";

      ctx.shadowColor =
        "black";

      ctx.shadowBlur =
        6;

      ctx.shadowOffsetX =
        2;

      ctx.shadowOffsetY =
        2;

      ctx.fillText(
        timestamp,
        canvas.width - 20,
        canvas.height - 20
      );

      ctx.shadowBlur =
        0;

      ctx.shadowOffsetX =
        0;

      ctx.shadowOffsetY =
        0;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return;
          }

          const file =
            new File(
              [blob],
              `capture_${Date.now()}.jpg`,
              {
                type:
                  "image/jpeg",
              }
            );

          onCapture(
            file
          );

          setCaptured(
            true
          );

          if (
            streamRef.current
          ) {
            streamRef.current
              .getTracks()
              .forEach(
                (track) =>
                  track.stop()
              );
          }

          setTimeout(
            () => {
              setCaptured(
                false
              );

              onClose?.();
            },
            1200
          );
        },
        "image/jpeg",
        0.9
      );
    }, [
      onCapture,
      onClose,
      videoReady,
    ]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="relative flex h-full w-full flex-col">
        <div className="flex items-center justify-between bg-black/80 p-3">
          <h3 className="text-sm font-extrabold text-white">
            Camera
          </h3>

          <button
            type="button"
            onClick={() => {
              if (
                streamRef.current
              ) {
                streamRef.current
                  .getTracks()
                  .forEach(
                    (track) =>
                      track.stop()
                  );
              }

              onClose?.();
            }}
            className="rounded-lg p-1.5 text-white transition-all hover:bg-white/10"
          >
            <FiX
              size={20}
            />
          </button>
        </div>

        {error ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="max-w-sm rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-xs font-semibold text-rose-700">
              {error}
            </div>
          </div>
        ) : (
          <div className="relative flex-1 bg-black">
            <video
              ref={
                videoRef
              }
              autoPlay
              playsInline
              muted
              onLoadedMetadata={
                handleVideoLoaded
              }
              className="h-full w-full object-cover"
              style={{
                imageRendering:
                  "auto",
              }}
            />

            <canvas
              ref={
                canvasRef
              }
              className="hidden"
            />
          </div>
        )}

        <div className="flex items-center justify-center gap-3 bg-black/80 p-4">
          <button
            type="button"
            onClick={
              handleCapture
            }
            disabled={
              !!error ||
              captured
            }
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-4 text-sm font-extrabold text-white shadow-lg transition-all hover:bg-emerald-700 disabled:opacity-50"
          >
            {captured ? (
              <>
                <FiCheck
                  size={20}
                />
                Captured!
              </>
            ) : (
              <>
                <FiCamera
                  size={20}
                />
                Take Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}