import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiX,
  FiRefreshCw,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import LocationPicker from "../../components/Report/LocationPicker";

const ISSUE_TYPES = [
  "Select issue type",
  "Illegal Dumping",
  "Uncollected Garbage",
  "Littering",
  "Overflowing Trash Bin",
  "Clogged drainage cause by waste",
  "Others( please specify in description )",
];

type SeverityLevel = "Low" | "Moderate" | "High";

interface SeverityResult {
  level: SeverityLevel;
  explanation: string;
}

function getSeverityFromWasteType(
  wasteType: string
): SeverityResult {
  switch (wasteType) {
    case "Illegal Dumping":
      return {
        level: "High",
        explanation:
          "Illegal dumping indicates improper waste disposal and requires priority action from barangay personnel.",
      };

    case "Overflowing Trash Bin":
      return {
        level: "High",
        explanation:
          "An overflowing trash bin may create sanitation concerns and should be addressed promptly.",
      };

    case "Clogged drainage cause by waste":
      return {
        level: "High",
        explanation:
          "Waste blocking drainage may contribute to flooding and sanitation problems and requires prompt attention.",
      };

    case "Uncollected Garbage":
      return {
        level: "Moderate",
        explanation:
          "Uncollected garbage may create sanitation and environmental concerns if it remains unattended.",
      };

    case "Littering":
      return {
        level: "Low",
        explanation:
          "A localized littering concern can generally be addressed through routine cleanup and monitoring.",
      };

    default:
      return {
        level: "Moderate",
        explanation:
          "The reported waste condition requires assessment and appropriate action by barangay personnel.",
      };
  }
}

function getSeverityClass(level: SeverityLevel) {
  switch (level) {
    case "High":
      return "bg-orange-50 border-orange-200 text-orange-800";

    case "Moderate":
      return "bg-amber-50 border-amber-200 text-amber-800";

    case "Low":
      return "bg-emerald-50 border-emerald-200 text-emerald-800";

    default:
      return "bg-slate-50 border-slate-200 text-slate-800";
  }
}

export default function ReportIssue() {
  const navigate = useNavigate();

  const [issueType, setIssueType] = useState<string>(
    "Select issue type"
  );

  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const [locationName, setLocationName] = useState<string>(
    "Barangay Tankulan, Manolo Fortich, Bukidnon"
  );

  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
  }>({
    lat: 8.361106,
    lng: 124.8647778,
  });

  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const severity =
    issueType === "Select issue type"
      ? null
      : getSeverityFromWasteType(issueType);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      }

      previews.forEach((preview) => {
        URL.revokeObjectURL(preview);
      });
    };
  }, []);

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const remainingSlots = 5 - images.length;

    if (remainingSlots <= 0) {
      setErrorMessage(
        "You can upload a maximum of 5 photos."
      );
      return;
    }

    const selectedFiles = filesArray.slice(
      0,
      remainingSlots
    );

    const newPreviewUrls = selectedFiles.map((file) =>
      URL.createObjectURL(file)
    );

    setImages((currentImages) => [
      ...currentImages,
      ...selectedFiles,
    ]);

    setPreviews((currentPreviews) => [
      ...currentPreviews,
      ...newPreviewUrls,
    ]);

    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeImage = (index: number) => {
    const previewToRemove = previews[index];

    if (previewToRemove) {
      URL.revokeObjectURL(previewToRemove);
    }

    setImages((currentImages) =>
      currentImages.filter((_, i) => i !== index)
    );

    setPreviews((currentPreviews) =>
      currentPreviews.filter((_, i) => i !== index)
    );
  };

  const handleLocationChange = (
    lat: number,
    lng: number,
    addressName?: string
  ) => {
    setCoords({ lat, lng });

    if (addressName) {
      setLocationName(addressName);
    }
  };

  const startCamera = async () => {
    setCameraError("");
    setCameraReady(false);
    setCameraOpen(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Your browser does not support camera access."
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: {
              ideal: "environment",
            },
            width: {
              ideal: 1280,
            },
            height: {
              ideal: 720,
            },
          },
          audio: false,
        });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await videoRef.current.play();

        setCameraReady(true);
      }
    } catch (error: any) {
      console.error("Camera error:", error);

      setCameraError(
        error?.message ||
          "Unable to access the camera. Please allow camera permission and try again."
      );

      setCameraReady(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraOpen(false);
    setCameraReady(false);
    setCameraError("");
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    if (!cameraReady) {
      return;
    }

    if (images.length >= 5) {
      setCameraError(
        "You can upload a maximum of 5 photos."
      );
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      setCameraError(
        "Camera is not ready yet. Please try again."
      );
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");

    if (!context) {
      setCameraError(
        "Unable to capture the photo."
      );
      return;
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCameraError(
            "Unable to create the captured photo."
          );
          return;
        }

        const file = new File(
          [blob],
          `camera_${Date.now()}.jpg`,
          {
            type: "image/jpeg",
          }
        );

        const previewUrl = URL.createObjectURL(file);

        setImages((currentImages) => [
          ...currentImages,
          file,
        ]);

        setPreviews((currentPreviews) => [
          ...currentPreviews,
          previewUrl,
        ]);

        stopCamera();
        setErrorMessage("");
      },
      "image/jpeg",
      0.9
    );
  };

  const uploadImages = async (
    userId: string
  ): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];

      const fileExt =
        file.name.split(".").pop()?.toLowerCase() ||
        "jpg";

      const fileName = `${userId}_${Date.now()}_${i}.${fileExt}`;

      const filePath = `reports/${fileName}`;

      const { error: uploadError } =
        await supabase.storage
          .from("waste-photos")
          .upload(filePath, file);

      if (uploadError) {
        throw new Error(
          `Photo upload failed: ${uploadError.message}`
        );
      }

      const { data: publicUrlData } =
        supabase.storage
          .from("waste-photos")
          .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error(
          "Photo upload succeeded, but the photo URL could not be created."
        );
      }

      uploadedUrls.push(
        publicUrlData.publicUrl
      );
    }

    return uploadedUrls;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Please log in to save a draft."
        );
        return;
      }

      const imageUrls = await uploadImages(
        user.id
      );

      const draftSeverity =
        issueType === "Select issue type"
          ? "Moderate"
          : getSeverityFromWasteType(
              issueType
            ).level;

      const { error } = await supabase
        .from("reports")
        .insert([
          {
            user_id: user.id,
            category:
              issueType === "Select issue type"
                ? "Draft"
                : issueType,
            title:
              issueType === "Select issue type"
                ? "Draft Waste Report"
                : issueType,
            waste_type:
              issueType === "Select issue type"
                ? "Draft Waste Report"
                : issueType,
            description,
            location_name: locationName,
            latitude: coords.lat,
            longitude: coords.lng,
            image_urls: imageUrls,
            severity: draftSeverity,
            status: "Draft",
          },
        ]);

      if (error) {
        setErrorMessage(
          `Error saving draft: ${error.message}`
        );
      } else {
        navigate("/drafts");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Failed to save draft."
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (issueType === "Select issue type") {
      setErrorMessage(
        "Please select an issue type."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Please log in to submit a report."
        );
        return;
      }

      const imageUrls = await uploadImages(
        user.id
      );

      const severityResult =
        getSeverityFromWasteType(
          issueType
        );

      const { error } = await supabase
        .from("reports")
        .insert([
          {
            user_id: user.id,
            category: issueType,
            title: issueType,
            waste_type: issueType,
            description,
            location_name: locationName,
            latitude: coords.lat,
            longitude: coords.lng,
            image_urls: imageUrls,
            severity: severityResult.level,
            status: "Pending",
          },
        ]);

      if (error) {
        setErrorMessage(
          `Failed to submit report: ${error.message}`
        );
      } else {
        navigate("/my-reports");
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          "Failed to submit report."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 font-sans">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-all"
        >
          <FiArrowLeft size={20} />
        </button>

        <h1 className="text-lg font-black text-slate-900 tracking-wider uppercase">
          CERMS
        </h1>

        <div className="w-8" />
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-slate-900">
          Submit Waste Report
        </h2>

        <p className="text-xs text-slate-500 font-semibold">
          Please provide the details of the issue
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >
        <div>
          <select
            value={issueType}
            onChange={(e) =>
              setIssueType(e.target.value)
            }
            required
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          >
            {ISSUE_TYPES.map((type) => (
              <option
                key={type}
                value={type}
                disabled={
                  type === "Select issue type"
                }
              >
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
            Description
          </label>

          <textarea
            rows={3}
            value={description}
            onChange={(e) =>
              setDescription(e.target.value)
            }
            placeholder="Describe the issue..."
            className="w-full p-4 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div>
          <p className="text-center text-xs font-extrabold text-slate-900 mb-2">
            Upload Photo Maximum of 5
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-center relative">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />

              <div className="space-y-1.5 flex flex-col items-center justify-center">
                <FiCamera
                  size={28}
                  className="text-emerald-700"
                />

                <span className="text-xs font-extrabold text-slate-800 block">
                  Choose File
                </span>

                <span className="text-[11px] text-slate-400 font-semibold block">
                  JPG, PNG up to 1 GB
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={startCamera}
              disabled={images.length >= 5}
              className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="space-y-1.5 flex flex-col items-center justify-center">
                <FiCamera
                  size={28}
                  className="text-emerald-700"
                />

                <span className="text-xs font-extrabold text-slate-800 block">
                  Take Photo
                </span>

                <span className="text-[11px] text-slate-400 font-semibold block">
                  Open device camera
                </span>
              </div>
            </button>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {previews.map((src, idx) => (
                <div
                  key={idx}
                  className="relative h-16 rounded-xl overflow-hidden border border-slate-200 group"
                >
                  <img
                    src={src}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeImage(idx)
                    }
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-all"
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {severity && (
          <div>
            <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-center">
              Automated Severity Assessment
            </label>

            <div
              className={`rounded-2xl border p-4 text-center ${getSeverityClass(
                severity.level
              )}`}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                System Assessment
              </p>

              <h4 className="text-lg font-black mt-1">
                {severity.level}
              </h4>

              <p className="text-xs font-semibold mt-1 leading-relaxed">
                {severity.explanation}
              </p>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
            Map Pinpoint Location
          </label>

          <LocationPicker
            selectedLat={coords.lat}
            selectedLng={coords.lng}
            onLocationChange={
              handleLocationChange
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="py-3.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl shadow-xs transition-all text-center disabled:opacity-50"
          >
            {savingDraft
              ? "SAVING..."
              : "SAVE AS DRAFT"}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="py-3.5 px-4 bg-black hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all text-center disabled:opacity-50"
          >
            {submitting
              ? "SUBMITTING..."
              : "SUBMIT REPORT"}
          </button>
        </div>
      </form>

      {cameraOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Take Photo
                </h3>

                <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                  Position the waste concern inside the camera view.
                </p>
              </div>

              <button
                type="button"
                onClick={stopCamera}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="relative bg-black aspect-[4/3]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {!cameraReady && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                  Opening camera...
                </div>
              )}

              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                  <FiCamera
                    size={42}
                    className="text-white mb-3"
                  />

                  <p className="text-sm font-bold text-white">
                    Camera unavailable
                  </p>

                  <p className="text-xs font-medium text-slate-300 mt-2 max-w-sm">
                    {cameraError}
                  </p>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-slate-900 text-xs font-extrabold hover:bg-slate-100 transition-all"
                  >
                    <FiRefreshCw size={14} />
                    Try Again
                  </button>
                </div>
              )}
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={capturePhoto}
                  disabled={!cameraReady}
                  className="h-16 w-16 rounded-full bg-emerald-700 border-4 border-white ring-2 ring-emerald-700 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Capture photo"
                >
                  <span className="block h-11 w-11 mx-auto rounded-full border-2 border-white" />
                </button>
              </div>

              <p className="text-center text-[11px] font-semibold text-slate-500">
                {images.length}/5 photos selected
              </p>
            </div>

            <canvas
              ref={canvasRef}
              className="hidden"
            />
          </div>
        </div>
      )}
    </div>
  );
}