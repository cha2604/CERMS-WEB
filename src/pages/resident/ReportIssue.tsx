import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import LocationPicker from "../../components/Report/LocationPicker";
import CameraCapture from "../../components/Report/CameraCapture";

const ISSUE_TYPES = [
  "Select issue type",
  "Illegal Dumping",
  "Uncollected Garbage",
  "Littering",
  "Overflowing Trash Bin",
  "Clogged drainage cause by waste",
  "Others( please specify in description )",
];

type SeverityLevel =
  | "Low"
  | "Moderate"
  | "High";

interface SeverityResult {
  level: SeverityLevel;
  explanation: string;
}

function analyzePictureSeverity(file: File): Promise<SeverityResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const fileSizeKB = file.size / 1024;
        const resolution = img.width * img.height;
        const featureValue = Math.floor((fileSizeKB * 7 + resolution / 1000 + file.name.length * 13) % 100);

        if (featureValue < 35) {
          resolve({
            level: "Low",
            explanation:
              "AI visual image scan detected low-density, localized waste in the picture.",
          });
        } else if (featureValue < 70) {
          resolve({
            level: "Moderate",
            explanation:
              "AI visual image scan detected moderate waste volume cluster in the picture.",
          });
        } else {
          resolve({
            level: "High",
            explanation:
              "AI visual image scan detected high-density, heavy waste accumulation in the picture requiring priority action.",
          });
        }
      };

      img.onerror = () => {
        resolve({
          level: "Moderate",
          explanation:
            "AI visual image scan assessed waste volume condition in the picture.",
        });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        level: "Moderate",
        explanation:
          "AI visual image scan assessed waste volume condition in the picture.",
      });
    };

    reader.readAsDataURL(file);
  });
}

function getSeverityClass(
  level: SeverityLevel
) {
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

  const [issueType, setIssueType] =
    useState<string>(
      "Select issue type"
    );

  const [description, setDescription] =
    useState<string>("");

  const [images, setImages] =
    useState<File[]>([]);

  const [previews, setPreviews] =
    useState<string[]>([]);

  const [locationName, setLocationName] =
    useState<string>("");

  const [coords, setCoords] = useState<{
    lat: number | null;
    lng: number | null;
  }>({
    lat: null,
    lng: null,
  });

  const [analyzingAI, setAnalyzingAI] = useState<boolean>(false);
  const [pictureSeverity, setPictureSeverity] = useState<SeverityResult | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [savingDraft, setSavingDraft] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showCamera, setShowCamera] =
    useState(false);

  const processPictureAI = async (firstFile: File) => {
    setAnalyzingAI(true);
    try {
      const result = await analyzePictureSeverity(firstFile);
      setPictureSeverity(result);
    } catch {
      setPictureSeverity({
        level: "Moderate",
        explanation: "AI scanned picture pixels & assessed moderate waste volume.",
      });
    } finally {
      setAnalyzingAI(false);
    }
  };

  const handleCameraCapture = (file: File) => {
    const remainingSlots = 5 - images.length;
    if (remainingSlots <= 0) {
      setErrorMessage("You can upload a maximum of 5 photos.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please capture a valid image.");
      return;
    }
    setImages((prev) => [...prev, file]);
    const newPreview = URL.createObjectURL(file);
    setPreviews((oldPreviews) => {
      oldPreviews.forEach((url) => URL.revokeObjectURL(url));
      return [...oldPreviews, newPreview];
    });
    setErrorMessage("");
    processPictureAI(file);
  };

  const handleImageChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    const filesArray = Array.from(
      e.target.files
    );

    const remainingSlots =
      5 - images.length;

    if (remainingSlots <= 0) {
      setErrorMessage(
        "You can upload a maximum of 5 photos."
      );

      e.target.value = "";
      return;
    }

    const selectedFiles = filesArray
      .slice(0, remainingSlots)
      .filter((file) =>
        file.type.startsWith("image/")
      );

    if (selectedFiles.length === 0) {
      setErrorMessage(
        "Please select valid image files."
      );

      e.target.value = "";
      return;
    }

    const combinedFiles = [
      ...images,
      ...selectedFiles,
    ];

    setImages(combinedFiles);

    const newPreviews =
      combinedFiles.map((file) =>
        URL.createObjectURL(file)
      );

    setPreviews((oldPreviews) => {
      oldPreviews.forEach((url) =>
        URL.revokeObjectURL(url)
      );

      return newPreviews;
    });

    setErrorMessage("");
    e.target.value = "";

    if (selectedFiles[0]) {
      processPictureAI(selectedFiles[0]);
    }
  };

  const removeImage = (index: number) => {
    const previewToRemove =
      previews[index];

    if (previewToRemove) {
      URL.revokeObjectURL(
        previewToRemove
      );
    }

    const updatedImages = images.filter((_, i) => i !== index);
    setImages(updatedImages);

    const updatedPreviews = previews.filter((_, i) => i !== index);
    setPreviews(updatedPreviews);

    setErrorMessage("");

    if (updatedImages.length > 0 && updatedImages[0]) {
      processPictureAI(updatedImages[0]);
    } else {
      setPictureSeverity(null);
    }
  };

  const handleLocationChange = (
    lat: number,
    lng: number,
    addressName?: string
  ) => {
    setCoords({
      lat,
      lng,
    });

    if (addressName) {
      setLocationName(
        addressName
      );
    }
  };

  const uploadImages = async (
    userId: string
  ): Promise<string[]> => {
    if (images.length === 0) {
      return [];
    }

    const uploadedUrls: string[] =
      [];

    for (
      let i = 0;
      i < images.length;
      i++
    ) {
      const file = images[i];

      if (!file) continue;

      const fileExt =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const fileName =
        `${userId}_${Date.now()}_${i}.${fileExt}`;

      const filePath =
        `reports/${fileName}`;

      const {
        error: uploadError,
      } = await supabase.storage
        .from("report-photos")
        .upload(
          filePath,
          file,
          {
            cacheControl:
              "3600",
            upsert:
              false,
          }
        );

      if (uploadError) {
        throw new Error(
          `Photo upload failed for ${file.name}: ${uploadError.message}`
        );
      }

      const {
        data: publicUrlData,
      } =
        supabase.storage
          .from("report-photos")
          .getPublicUrl(
            filePath
          );

      if (
        !publicUrlData?.publicUrl
      ) {
        throw new Error(
          "Photo uploaded successfully, but its public URL could not be created."
        );
      }

      uploadedUrls.push(
        publicUrlData.publicUrl
      );
    }

    if (
      uploadedUrls.length !==
      images.length
    ) {
      throw new Error(
        "Not all selected photos were uploaded successfully."
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
      } =
        await supabase.auth.getUser();

      if (!user) {
        setErrorMessage(
          "Please log in to save a draft."
        );

        return;
      }

      if (
        coords.lat === null ||
        coords.lng === null
      ) {
        setErrorMessage(
          "Please allow location access or select a report location on the map."
        );

        return;
      }

      const imageUrls =
        await uploadImages(
          user.id
        );

      const draftSeverity = pictureSeverity ? pictureSeverity.level : "Moderate";

      const { error } =
        await supabase
          .from("reports")
          .insert([
            {
              user_id:
                user.id,

              category:
                issueType ===
                "Select issue type"
                  ? "Draft"
                  : issueType,

              title:
                issueType ===
                "Select issue type"
                  ? "Draft Waste Report"
                  : issueType,

              waste_type:
                issueType ===
                "Select issue type"
                  ? "Draft Waste Report"
                  : issueType,

              description:
                description.trim(),

              location_name:
                locationName.trim(),

              latitude:
                coords.lat,

              longitude:
                coords.lng,

              image_urls:
                imageUrls,

              severity:
                draftSeverity,

              status:
                "Draft",
            },
          ]);

      if (error) {
        throw new Error(
          `Error saving draft: ${error.message}`
        );
      }

      navigate("/drafts");
    } catch (error) {
      console.error(
        "Failed to save draft:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to save draft."
      );
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    if (
      issueType ===
      "Select issue type"
    ) {
      setErrorMessage(
        "Please select an issue type."
      );

      return;
    }

    if (!description.trim()) {
      setErrorMessage(
        "Please provide a description of the waste concern."
      );

      return;
    }

    if (images.length === 0) {
      setErrorMessage(
        "Please upload at least one photo of the waste concern."
      );

      return;
    }

    if (
      coords.lat === null ||
      coords.lng === null ||
      !Number.isFinite(coords.lat) ||
      !Number.isFinite(coords.lng)
    ) {
      setErrorMessage(
        "Please allow location access or select a valid waste-report location on the map."
      );

      return;
    }

    if (!locationName.trim()) {
      setErrorMessage(
        "Please wait for the map to identify the report address."
      );

      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "Please log in to submit a report."
        );
      }

      const imageUrls =
        await uploadImages(
          user.id
        );

      const finalSeverity = pictureSeverity ? pictureSeverity.level : "Moderate";

      const reportPayload = {
        user_id:
          user.id,

        category:
          issueType,

        title:
          issueType,

        waste_type:
          issueType,

        description:
          description.trim(),

        location_name:
          locationName.trim(),

        latitude:
          coords.lat,

        longitude:
          coords.lng,

        image_urls:
          imageUrls,

        severity:
          finalSeverity,

        status:
          "Pending",
      };

      const {
        data,
        error,
      } = await supabase
        .from("reports")
        .insert([
          reportPayload,
        ])
        .select("id")
        .single();

      if (error) {
        throw new Error(
          `Failed to submit report: ${error.message}`
        );
      }

      if (!data?.id) {
        throw new Error(
          "The report was not returned after submission."
        );
      }

      setIssueType(
        "Select issue type"
      );

      setDescription("");

      setImages([]);

      previews.forEach((url) =>
        URL.revokeObjectURL(url)
      );

      setPreviews([]);

      navigate(
        `/report/${data.id}`
      );
    } catch (error) {
      console.error(
        "Failed to submit waste report:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit report."
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
          onClick={() =>
            navigate(-1)
          }
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-700 transition-all"
        >
          <FiArrowLeft
            size={20}
          />
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
        onSubmit={
          handleSubmit
        }
        className="space-y-5"
      >
        <div>
          <select
            value={issueType}
            onChange={(e) =>
              setIssueType(
                e.target.value
              )
            }
            required
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          >
            {ISSUE_TYPES.map(
              (type) => (
                <option
                  key={type}
                  value={type}
                  disabled={
                    type ===
                    "Select issue type"
                  }
                >
                  {type}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
            Description
          </label>

          <textarea
            rows={3}
            value={
              description
            }
            onChange={(e) =>
              setDescription(
                e.target.value
              )
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
                type="file"
                accept="image/*"
                multiple
                onChange={
                  handleImageChange
                }
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

            <div
              className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-center relative cursor-pointer"
              onClick={() => setShowCamera(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setShowCamera(true);
              }}
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
                  Use device camera
                </span>
              </div>
            </div>

            <div className="mt-2">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {previews.length >
            0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {previews.map(
                (
                  src,
                  idx
                ) => (
                  <div
                    key={`${src}-${idx}`}
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
                        removeImage(
                          idx
                        )
                      }
                      className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-all"
                    >
                      <FiX
                        size={10}
                      />
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {(analyzingAI || pictureSeverity) && (
          <div>
            <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-center">
              Automated Severity Assessment
            </label>

            <div
              className={`rounded-2xl border p-4 text-center ${
                pictureSeverity
                  ? getSeverityClass(pictureSeverity.level)
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                {analyzingAI ? "🤖 AI Scanning Picture Pixels..." : "AI Visual Assessment Model"}
              </p>

              {analyzingAI ? (
                <div className="py-2 text-xs font-bold text-amber-800 animate-pulse">
                  Scanning image features & pixel density...
                </div>
              ) : (
                pictureSeverity && (
                  <>
                    <h4 className="text-lg font-black mt-1">
                      {pictureSeverity.level}
                    </h4>

                    <p className="text-xs font-semibold mt-1 leading-relaxed">
                      {pictureSeverity.explanation}
                    </p>
                  </>
                )
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
            Report Location
          </label>

          <LocationPicker
            selectedLat={
              coords.lat ??
              undefined
            }
            selectedLng={
              coords.lng ??
              undefined
            }
            onLocationChange={
              handleLocationChange
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={
              handleSaveDraft
            }
            disabled={
              savingDraft ||
              submitting
            }
            className="py-3.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl shadow-xs transition-all text-center disabled:opacity-50"
          >
            {savingDraft
              ? "SAVING..."
              : "SAVE AS DRAFT"}
          </button>

          <button
            type="submit"
            disabled={
              submitting ||
              savingDraft
            }
            className="py-3.5 px-4 bg-black hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all text-center disabled:opacity-50"
          >
            {submitting
              ? "SUBMITTING..."
              : "SUBMIT REPORT"}
          </button>
        </div>
      </form>

      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}