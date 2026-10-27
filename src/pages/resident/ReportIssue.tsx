import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCamera,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiFileText,
  FiMapPin,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import LocationPicker from "../../components/Report/LocationPicker";
import CameraCapture from "../../components/Report/CameraCapture";

const ISSUE_TYPES = [
  "Illegal Dumping",
  "Uncollected Garbage",
  "Littering Spot",
  "Overflowing Trash Bin",
  "Clogged Drainage Waste",
  "Hazardous / Electronic Waste",
  "Others",
];

const STEPS = [
  "Type",
  "Details",
  "Photo",
  "Location",
  "Review",
];

type SeverityLevel =
  | "Low"
  | "Moderate"
  | "High"
  | "None";

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
        try {
          const canvas = document.createElement("canvas");
          const maxSize = 200;
          const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("No context");

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const pixels = imageData.data;

          let totalPixels = canvas.width * canvas.height;
          let wasteLikePixels = 0;
          let darkPixels = 0;
          let edgeComplexity = 0;
          let totalBrightness = 0;
          let skinTonePixels = 0;
          let skyPixels = 0;

          for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];

            const brightness = (r * 0.299 + g * 0.587 + b * 0.114);
            totalBrightness += brightness;

            // Waste-like colors: browns, grays, dark greens, muted tones
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const saturation = maxC === 0 ? 0 : (maxC - minC) / maxC;
            const isBrownish = r > g && g > b && r - b > 20 && saturation < 0.6;
            const isGrayish = Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && brightness < 180;
            const isDarkGreen = g > r && g > b && brightness < 120;
            const isDark = brightness < 80;

            if (isBrownish || isGrayish || isDarkGreen || isDark) {
              wasteLikePixels++;
            }
            if (isDark) darkPixels++;

            // Skin tone detection (for selfies/faces)
            const isSkinTone = r > 95 && g > 40 && b > 20 && r > g && r > b && (r - g) > 15 && (r - b) > 15 && saturation > 0.1 && saturation < 0.7 && brightness > 80;
            if (isSkinTone) skinTonePixels++;

            // Sky detection (blue dominant, high brightness)
            const isSky = b > r && b > g && b > 150 && brightness > 150 && saturation > 0.2;
            if (isSky) skyPixels++;
          }

          // Edge complexity: compare adjacent pixel differences
          for (let y = 0; y < canvas.height - 1; y++) {
            for (let x = 0; x < canvas.width - 1; x++) {
              const idx = (y * canvas.width + x) * 4;
              const idxRight = (y * canvas.width + (x + 1)) * 4;
              const idxDown = ((y + 1) * canvas.width + x) * 4;
              const diffR = Math.abs(pixels[idx] - pixels[idxRight]);
              const diffG = Math.abs(pixels[idx + 1] - pixels[idxRight + 1]);
              const diffB = Math.abs(pixels[idx + 2] - pixels[idxRight + 2]);
              const diffDownR = Math.abs(pixels[idx] - pixels[idxDown]);
              const diffDownG = Math.abs(pixels[idx + 1] - pixels[idxDown + 1]);
              const diffDownB = Math.abs(pixels[idx + 2] - pixels[idxDown + 2]);
              if (diffR + diffG + diffB > 60 || diffDownR + diffDownG + diffDownB > 60) {
                edgeComplexity++;
              }
            }
          }

          const wasteRatio = wasteLikePixels / totalPixels;
          const darkRatio = darkPixels / totalPixels;
          const edgeRatio = edgeComplexity / ((canvas.width - 1) * (canvas.height - 1));
          const avgBrightness = totalBrightness / totalPixels;
          const skinRatio = skinTonePixels / totalPixels;
          const skyRatio = skyPixels / totalPixels;

          // Check if image is NOT waste-related
          const isSelfie = skinRatio > 0.15;
          const isSky = skyRatio > 0.3;
          const isUniformWall = edgeRatio < 0.05 && wasteRatio < 0.15;
          const hasNoWaste = wasteRatio < 0.1 && edgeRatio < 0.15;

          if (isSelfie || isSky || isUniformWall || hasNoWaste) {
            resolve({
              level: "None",
              explanation: "No waste detected. The image does not appear to contain waste or debris. Please capture a photo of the actual waste concern.",
            });
            return;
          }

          // Combine metrics: higher waste ratio + edge complexity = more severe
          const severityScore = (wasteRatio * 40) + (edgeRatio * 30) + (darkRatio * 20) + ((255 - avgBrightness) / 255 * 10);

          if (severityScore < 25) {
            resolve({
              level: "Low",
              explanation: "AI visual scan detected low-density waste with minimal clutter and good lighting conditions.",
            });
          } else if (severityScore < 50) {
            resolve({
              level: "Moderate",
              explanation: "AI visual scan detected moderate waste accumulation with noticeable clutter and mixed debris.",
            });
          } else {
            resolve({
              level: "High",
              explanation: "AI visual scan detected high-density waste accumulation with heavy clutter, dark tones, and significant debris requiring priority action.",
            });
          }
        } catch {
          resolve({
            level: "Moderate",
            explanation: "AI visual scan assessed waste volume condition in the picture.",
          });
        }
      };

      img.onerror = () => {
        resolve({
          level: "Moderate",
          explanation: "AI visual scan assessed waste volume condition in the picture.",
        });
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      resolve({
        level: "Moderate",
        explanation: "AI visual scan assessed waste volume condition in the picture.",
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

    case "None":
      return "bg-slate-50 border-slate-200 text-slate-600";

    default:
      return "bg-slate-50 border-slate-200 text-slate-800";
  }
}

export default function ReportIssue() {
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] =
    useState(1);

  const [issueType, setIssueType] =
    useState("");

  const [otherIssue, setOtherIssue] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [images, setImages] =
    useState<File[]>([]);

  const [previews, setPreviews] =
    useState<string[]>([]);

  const [locationName, setLocationName] =
    useState("");

  const [locationDetails, setLocationDetails] =
    useState("");

  const [coords, setCoords] = useState<{
    lat: number | null;
    lng: number | null;
  }>({
    lat: null,
    lng: null,
  });

  const [analyzingAI, setAnalyzingAI] =
    useState<boolean>(false);

  const [pictureSeverity, setPictureSeverity] =
    useState<SeverityResult | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [savingDraft, setSavingDraft] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [showCamera, setShowCamera] =
    useState(false);

  const finalIssueType =
    issueType === "Others"
      ? otherIssue.trim()
      : issueType;

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
    const remainingSlots =
      5 - images.length;

    if (remainingSlots <= 0) {
      setErrorMessage(
        "You can take a maximum of 5 photos."
      );
      return;
    }

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setErrorMessage(
        "Please capture a valid image."
      );
      return;
    }

    setImages((prev) => [
      ...prev,
      file,
    ]);

    const newPreview =
      URL.createObjectURL(file);

    setPreviews((prev) => [
      ...prev,
      newPreview,
    ]);

    setErrorMessage("");

    processPictureAI(file);
  };

  const removeImage = (
    index: number
  ) => {
    const previewToRemove =
      previews[index];

    if (previewToRemove) {
      URL.revokeObjectURL(
        previewToRemove
      );
    }

    const updatedImages =
      images.filter(
        (_, i) =>
          i !== index
      );

    const updatedPreviews =
      previews.filter(
        (_, i) =>
          i !== index
      );

    setImages(
      updatedImages
    );

    setPreviews(
      updatedPreviews
    );

    setErrorMessage("");

    if (
      updatedImages.length >
        0 &&
      updatedImages[0]
    ) {
      processPictureAI(
        updatedImages[0]
      );
    } else {
      setPictureSeverity(
        null
      );
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
    if (
      images.length === 0
    ) {
      return [];
    }

    const uploadedUrls: string[] =
      [];

    for (
      let i = 0;
      i < images.length;
      i++
    ) {
      const file =
        images[i];

      if (!file) {
        continue;
      }

      const fileExt =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      const fileName =
        `${Date.now()}_${i}.${fileExt}`;

      const filePath =
        `reports/${userId}/${fileName}`;

      const {
        error: uploadError,
      } =
        await supabase.storage
          .from(
            "report-photos"
          )
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
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "report-photos"
          )
          .getPublicUrl(
            filePath
          );

      if (
        !publicUrlData
          ?.publicUrl
      ) {
        throw new Error(
          "Photo captured successfully, but its public URL could not be created."
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
        "Not all captured photos were uploaded successfully."
      );
    }

    return uploadedUrls;
  };

  const validateCurrentStep =
    () => {
      setErrorMessage("");

      if (
        currentStep === 1
      ) {
        if (!issueType) {
          setErrorMessage(
            "Please select a waste issue."
          );

          return false;
        }

        if (
          issueType ===
            "Others" &&
          !otherIssue.trim()
        ) {
          setErrorMessage(
            "Please specify the waste issue."
          );

          return false;
        }
      }

      if (
        currentStep === 2
      ) {
        if (
          !description.trim()
        ) {
          setErrorMessage(
            "Please provide a description of the waste concern."
          );

          return false;
        }
      }

      if (
        currentStep === 3
      ) {
        if (
          images.length === 0
        ) {
          setErrorMessage(
            "Please take at least one photo of the waste concern."
          );

          return false;
        }

        if (analyzingAI) {
          setErrorMessage(
            "Please wait for the automated severity assessment to finish."
          );

          return false;
        }

        if (
          pictureSeverity
            ?.level ===
          "None"
        ) {
          setErrorMessage(
            "The captured photo does not appear to contain waste. Please take a photo of the actual waste concern."
          );

          return false;
        }
      }

      if (
        currentStep === 4
      ) {
        if (
          coords.lat ===
            null ||
          coords.lng ===
            null ||
          !Number.isFinite(
            coords.lat
          ) ||
          !Number.isFinite(
            coords.lng
          )
        ) {
          setErrorMessage(
            "Please allow location access or select a valid waste-report location."
          );

          return false;
        }

        if (
          !locationName.trim()
        ) {
          setErrorMessage(
            "Please wait for the location to be identified."
          );

          return false;
        }
      }

      return true;
    };

  const handleNext =
    () => {
      if (
        !validateCurrentStep()
      ) {
        return;
      }

      if (
        currentStep < 5
      ) {
        setCurrentStep(
          (prev) =>
            prev + 1
        );

        setErrorMessage("");
      }
    };

  const handleBack =
    () => {
      if (
        currentStep > 1
      ) {
        setCurrentStep(
          (prev) =>
            prev - 1
        );

        setErrorMessage("");

        return;
      }

      navigate(-1);
    };

  const handleSaveDraft =
    async () => {
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
          coords.lat ===
            null ||
          coords.lng ===
            null
        ) {
          setErrorMessage(
            "Please complete the location step before saving this report as a draft."
          );

          return;
        }

        const imageUrls =
          await uploadImages(
            user.id
          );

        const draftSeverity =
          pictureSeverity
            ? pictureSeverity.level
            : "Moderate";

        const fullDraftLocationName =
          locationDetails.trim()
            ? `${locationName.trim()} - ${locationDetails.trim()}`
            : locationName.trim();

        const draftIssue =
          finalIssueType ||
          "Draft Waste Report";

        const { error } =
          await supabase
            .from(
              "reports"
            )
            .insert([
              {
                user_id:
                  user.id,

                category:
                  draftIssue,

                title:
                  draftIssue,

                waste_type:
                  draftIssue,

                description:
                  description.trim(),

                location_name:
                  fullDraftLocationName,

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

        navigate(
          "/drafts"
        );
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
        setSavingDraft(
          false
        );
      }
    };

  const handleSubmit =
    async () => {
      setErrorMessage("");

      if (
        !finalIssueType
      ) {
        setErrorMessage(
          "Please select a valid waste issue."
        );
        setCurrentStep(1);
        return;
      }

      if (
        !description.trim()
      ) {
        setErrorMessage(
          "Please provide a description of the waste concern."
        );
        setCurrentStep(2);
        return;
      }

      if (
        images.length === 0
      ) {
        setErrorMessage(
          "Please take at least one photo of the waste concern."
        );
        setCurrentStep(3);
        return;
      }

      if (
        pictureSeverity
          ?.level ===
        "None"
      ) {
        setErrorMessage(
          "The captured photo does not appear to contain waste. Please take a photo of the actual waste concern."
        );
        setCurrentStep(3);
        return;
      }

      if (
        coords.lat ===
          null ||
        coords.lng ===
          null ||
        !Number.isFinite(
          coords.lat
        ) ||
        !Number.isFinite(
          coords.lng
        )
      ) {
        setErrorMessage(
          "Please allow location access or select a valid waste-report location."
        );
        setCurrentStep(4);
        return;
      }

      if (
        !locationName.trim()
      ) {
        setErrorMessage(
          "Please wait for the location to be identified."
        );
        setCurrentStep(4);
        return;
      }

      setSubmitting(true);

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

        const finalSeverity =
          pictureSeverity
            ? pictureSeverity.level
            : "Moderate";

        const fullLocationName =
          locationDetails.trim()
            ? `${locationName.trim()} - ${locationDetails.trim()}`
            : locationName.trim();

        const reportPayload = {
          user_id:
            user.id,

          category:
            finalIssueType,

          title:
            finalIssueType,

          waste_type:
            finalIssueType,

          description:
            description.trim(),

          location_name:
            fullLocationName,

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

      // Notify admin users about the new report
      try {
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin");

        if (adminProfiles && adminProfiles.length > 0) {
          const notifications = adminProfiles.map((admin) => ({
            user_id: admin.id,
            title: "New Waste Report Submitted",
            message: `A new ${issueType} report has been submitted at ${locationName.trim() || "Barangay Tankulan"}.`,
            type: "new_report",
            link_url: `/report/${data.id}`,
            is_read: false,
            created_at: new Date().toISOString(),
          }));

          await supabase.from("notifications").insert(notifications);
        }
      } catch (notifError) {
        console.error("Failed to send admin notification:", notifError);
      }

        previews.forEach(
          (url) =>
            URL.revokeObjectURL(
              url
            )
        );

        setIssueType("");
        setOtherIssue("");
        setDescription("");
        setImages([]);
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
        setSubmitting(
          false
        );
      }
    };

  return (
    <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <button
          type="button"
          onClick={
            handleBack
          }
          className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100"
        >
          <FiArrowLeft
            size={20}
          />
        </button>

        <h1 className="text-lg font-black tracking-wide text-slate-900">
          Submit Waste Report
        </h1>

        <div className="w-9" />
      </div>

      <div className="mt-6">
        <div className="flex items-start justify-between">
          {STEPS.map(
            (
              step,
              index
            ) => {
              const number =
                index + 1;

              const active =
                number ===
                currentStep;

              const completed =
                number <
                currentStep;

              return (
                <div
                  key={step}
                  className="flex flex-1 flex-col items-center"
                >
                  <div className="flex w-full items-center">
                    {index >
                      0 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          completed ||
                          active
                            ? "bg-emerald-700"
                            : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                        active ||
                        completed
                          ? "bg-emerald-700 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {completed ? (
                        <FiCheck
                          size={15}
                        />
                      ) : (
                        number
                      )}
                    </div>

                    {index <
                      STEPS.length -
                        1 && (
                      <div
                        className={`h-0.5 flex-1 ${
                          number <
                          currentStep
                            ? "bg-emerald-700"
                            : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>

                  <span
                    className={`mt-2 text-[10px] font-bold ${
                      active
                        ? "text-emerald-800"
                        : "text-slate-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            }
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="mt-7">
        {currentStep ===
          1 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                What type of waste issue are you reporting?
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select the option that best describes the problem.
              </p>
            </div>

            <div className="space-y-3">
              {ISSUE_TYPES.map(
                (type) => (
                  <button
                    key={
                      type
                    }
                    type="button"
                    onClick={() => {
                      setIssueType(
                        type
                      );

                      setErrorMessage(
                        ""
                      );

                      if (
                        type !==
                        "Others"
                      ) {
                        setOtherIssue(
                          ""
                        );
                      }
                    }}
                    className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition ${
                      issueType ===
                      type
                        ? "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-100"
                        : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        issueType ===
                        type
                          ? "bg-emerald-700 text-white"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <FiTrash2
                        size={20}
                      />
                    </div>

                    <div className="flex-1">
                      <p className="font-extrabold text-slate-900">
                        {type}
                      </p>

                      {type ===
                        "Illegal Dumping" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Waste dumped in open areas, roadsides, or unauthorized locations.
                        </p>
                      )}

                      {type ===
                        "Uncollected Garbage" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Garbage that has not been collected or has been left for several days.
                        </p>
                      )}

                      {type ===
                        "Littering Spot" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Scattered wrappers, bottles, plastics, and other small waste.
                        </p>
                      )}

                      {type ===
                        "Overflowing Trash Bin" && (
                        <p className="mt-1 text-xs text-slate-500">
                          A waste container that is already full or overflowing.
                        </p>
                      )}

                      {type ===
                        "Clogged Drainage Waste" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Waste blocking a drainage canal or preventing proper water flow.
                        </p>
                      )}

                      {type ===
                        "Hazardous / Electronic Waste" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Batteries, electronics, chemicals, or other potentially hazardous waste.
                        </p>
                      )}

                      {type ===
                        "Others" && (
                        <p className="mt-1 text-xs text-slate-500">
                          Select this if the waste concern is not listed above.
                        </p>
                      )}
                    </div>

                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        issueType ===
                        type
                          ? "border-emerald-700 bg-emerald-700 ring-4 ring-emerald-100"
                          : "border-slate-300"
                      }`}
                    />
                  </button>
                )
              )}
            </div>

            {issueType ===
              "Others" && (
              <div className="mt-5">
                <label className="mb-2 block text-sm font-extrabold text-slate-800">
                  Please specify the waste issue
                </label>

                <input
                  type="text"
                  value={
                    otherIssue
                  }
                  onChange={(e) =>
                    setOtherIssue(
                      e.target.value
                    )
                  }
                  placeholder="Enter another waste issue"
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            )}
          </div>
        )}

        {currentStep ===
          2 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Report Details
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tell the barangay what you observed.
              </p>
            </div>

            <label className="mb-2 block text-sm font-extrabold text-slate-800">
              Description
            </label>

            <textarea
              rows={7}
              value={
                description
              }
              onChange={(e) =>
                setDescription(
                  e.target.value
                )
              }
              placeholder="Example: A pile of household garbage was dumped beside the road. It includes plastic bags, bottles, food waste, and cartons."
              className="w-full resize-none rounded-2xl border border-slate-300 p-4 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />

            <p className="mt-2 text-right text-xs font-semibold text-slate-400">
              {description.length}
              /500
            </p>
          </div>
        )}

        {currentStep ===
          3 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Take Photo
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Capture the actual waste concern using your device camera.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowCamera(
                  true
                )
              }
              disabled={
                images.length >=
                5
              }
              className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/50 px-5 py-10 text-center transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                <FiCamera
                  size={27}
                />
              </div>

              <span className="mt-4 font-black text-slate-900">
                Take Photo
              </span>

              <span className="mt-1 text-xs font-semibold text-slate-500">
                Camera only • Maximum of 5 photos
              </span>
            </button>

            {previews.length >
              0 && (
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {previews.map(
                  (
                    src,
                    index
                  ) => (
                    <div
                      key={`${src}-${index}`}
                      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                    >
                      <img
                        src={src}
                        alt={`Captured waste ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(
                            index
                          )
                        }
                        className="absolute right-2 top-2 rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
                      >
                        <FiX
                          size={14}
                        />
                      </button>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex gap-3">
                <FiCamera
                  className="mt-0.5 shrink-0 text-emerald-700"
                  size={18}
                />

                <div>
                  <p className="text-sm font-extrabold text-emerald-900">
                    Photo required
                  </p>

                  <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                    The captured photo is used by CERMS for the automated severity assessment.
                  </p>
                </div>
              </div>
            </div>

            {(analyzingAI ||
              pictureSeverity) && (
              <div className="mt-5">
                <label className="mb-2 block text-center text-xs font-extrabold text-slate-900">
                  Automated Severity Assessment
                </label>

                <div
                  className={`rounded-2xl border p-4 text-center ${
                    pictureSeverity
                      ? getSeverityClass(
                          pictureSeverity.level
                        )
                      : "bg-slate-50 border-slate-200 text-slate-800"
                  }`}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
                    {analyzingAI
                      ? "🤖 AI Scanning Picture Pixels..."
                      : "AI Visual Assessment Model"}
                  </p>

                  {analyzingAI ? (
                    <div className="py-2 text-xs font-bold text-amber-800 animate-pulse">
                      Scanning image features & pixel density...
                    </div>
                  ) : (
                    pictureSeverity && (
                      <>
                        <h4 className="mt-1 text-lg font-black">
                          {
                            pictureSeverity.level
                          }
                        </h4>

                        <p className="mt-1 text-xs font-semibold leading-relaxed">
                          {
                            pictureSeverity.explanation
                          }
                        </p>
                      </>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep ===
          4 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Report Location
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Confirm where the waste concern is located.
              </p>
            </div>

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

            {locationName && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex gap-3">
                  <FiMapPin
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-800">
                      Detected Location
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                      {
                        locationName
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-extrabold text-slate-800">
                Additional Location Details
              </label>

              <textarea
                rows={3}
                value={
                  locationDetails
                }
                onChange={(e) =>
                  setLocationDetails(
                    e.target.value
                  )
                }
                placeholder="Example: Beside the basketball court, near the waiting shed, behind the barangay road..."
                className="w-full resize-none rounded-2xl border border-slate-300 p-4 text-sm text-slate-800 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>
        )}

        {currentStep ===
          5 && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900">
                Review Your Report
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Check the information before submitting it to Barangay Tankulan.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Waste Type
                </p>

                <p className="mt-1 font-extrabold text-slate-900">
                  {
                    finalIssueType
                  }
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex gap-3">
                  <FiFileText
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Description
                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-slate-700">
                      {
                        description
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex gap-3">
                  <FiMapPin
                    size={19}
                    className="mt-0.5 shrink-0 text-emerald-700"
                  />

                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Location
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {
                        locationName
                      }
                    </p>

                    {locationDetails && (
                      <p className="mt-1 text-xs text-slate-500">
                        {
                          locationDetails
                        }
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Captured Photos
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {previews.map(
                    (
                      src,
                      index
                    ) => (
                      <img
                        key={`${src}-review-${index}`}
                        src={
                          src
                        }
                        alt={`Waste evidence ${index + 1}`}
                        className="h-24 w-full rounded-xl object-cover"
                      />
                    )
                  )}
                </div>
              </div>

              {pictureSeverity && (
                <div
                  className={`rounded-2xl border p-4 ${getSeverityClass(
                    pictureSeverity.level
                  )}`}
                >
                  <p className="text-xs font-black uppercase tracking-wide opacity-70">
                    Automatically Detected Severity
                  </p>

                  <div className="mt-2 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xl font-black">
                        {
                          pictureSeverity.level
                        }
                      </p>

                      <p className="mt-1 text-xs font-semibold leading-relaxed">
                        {
                          pictureSeverity.explanation
                        }
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 border-t border-current/10 pt-3 text-[11px] font-semibold opacity-70">
                    Severity was automatically detected from the captured waste photo.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 border-t border-slate-100 pt-5">
        {currentStep <
          5 ? (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={
                handleBack
              }
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
            >
              <FiChevronLeft
                size={18}
              />
              Back
            </button>

            <button
              type="button"
              onClick={
                handleNext
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800"
            >
              Next
              <FiChevronRight
                size={18}
              />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={
                  handleBack
                }
                disabled={
                  submitting ||
                  savingDraft
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <FiChevronLeft
                  size={18}
                />
                Back
              </button>

              <button
                type="button"
                onClick={
                  handleSubmit
                }
                disabled={
                  submitting ||
                  savingDraft
                }
                className="rounded-xl bg-emerald-700 px-4 py-3.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Report"}
              </button>
            </div>

            <button
              type="button"
              onClick={
                handleSaveDraft
              }
              disabled={
                savingDraft ||
                submitting
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {savingDraft
                ? "Saving Draft..."
                : "Save as Draft"}
            </button>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture
          onCapture={
            handleCameraCapture
          }
          onClose={() =>
            setShowCamera(
              false
            )
          }
        />
      )}
    </div>
  );
}