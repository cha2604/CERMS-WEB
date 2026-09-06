import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiCamera, FiMapPin, FiX } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import LocationPicker from "../../components/Report/LocationPicker";

const ISSUE_TYPES = [
  "Select issue type",
  "Illegal Dumping",
  "Uncollected Garbage",
  "Littering Spot",
  "Hazardous / Electronic Waste",
  "Overflowing Trash Bin",
  "Clogged Drainage Waste",
  "Others",
];

interface SeverityResult {
  level: "Critical" | "High" | "Moderate" | "Low";
  explanation: string;
}

export default function ReportIssue() {
  const navigate = useNavigate();
  const [issueType, setIssueType] = useState<string>("Select issue type");
  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [locationName, setLocationName] = useState<string>("Zone 2 (Central Tankulan), Barangay Tankulan, Manolo Fortich, Bukidnon");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 8.361106,
    lng: 124.8647778,
  });

  const [severity, setSeverity] = useState<SeverityResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const analyzeSeverity = (type: string, fileCount: number): SeverityResult => {
    if (type === "Hazardous / Electronic Waste" || type === "Clogged Drainage Waste") {
      return {
        level: "Critical",
        explanation: "Identified as Critical due to immediate biohazard risk and environmental contamination potential.",
      };
    }
    if (type === "Illegal Dumping" || fileCount >= 3) {
      return {
        level: "High",
        explanation: "Identified as Severe/High volume accumulation requiring priority barangay sanitation dispatch.",
      };
    }
    if (type === "Overflowing Trash Bin" || type === "Uncollected Garbage") {
      return {
        level: "Moderate",
        explanation: "Identified as Moderate concern affecting public sanitation.",
      };
    }
    return {
      level: "Low",
      explanation: "Identified as Low/Minor littering issue.",
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const filesArray = Array.from(e.target.files);
    const combinedFiles = [...images, ...filesArray].slice(0, 5);
    setImages(combinedFiles);

    const newPreviews = combinedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(newPreviews);

    const currentType = issueType === "Select issue type" ? "Illegal Dumping" : issueType;
    const result = analyzeSeverity(currentType, combinedFiles.length);
    setSeverity(result);
  };

  const removeImage = (index: number) => {
    const updatedImages = images.filter((_, i) => i !== index);
    const updatedPreviews = previews.filter((_, i) => i !== index);
    setImages(updatedImages);
    setPreviews(updatedPreviews);

    if (updatedImages.length > 0) {
      const currentType = issueType === "Select issue type" ? "Illegal Dumping" : issueType;
      setSeverity(analyzeSeverity(currentType, updatedImages.length));
    } else {
      setSeverity(null);
    }
  };

  const handleLocationChange = (lat: number, lng: number, addressName?: string) => {
    setCoords({ lat, lng });
    if (addressName) {
      setLocationName(addressName);
    }
  };

  const uploadImages = async (userId: string): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const file = images[i];
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}_${Date.now()}_${i}.${fileExt}`;
      const filePath = `reports/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("waste-photos")
        .upload(filePath, file);

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from("waste-photos")
          .getPublicUrl(filePath);
        if (publicUrlData?.publicUrl) {
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }
    }

    if (uploadedUrls.length === 0 && previews.length > 0) {
      return previews;
    }

    return uploadedUrls;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    setErrorMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage("Please log in to save a draft.");
        setSavingDraft(false);
        return;
      }

      const imageUrls = await uploadImages(user.id);

      const { error } = await supabase.from("reports").insert([
        {
          user_id: user.id,
          title: issueType === "Select issue type" ? "Draft Waste Report" : issueType,
          waste_type: issueType === "Select issue type" ? "Draft Waste Report" : issueType,
          description: description,
          location_name: locationName,
          latitude: coords.lat,
          longitude: coords.lng,
          image_urls: imageUrls,
          severity: severity?.level || "Moderate",
          status: "Draft",
        },
      ]);

      if (error) {
        setErrorMessage(`Error saving draft: ${error.message}`);
      } else {
        navigate("/drafts");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (issueType === "Select issue type") {
      setErrorMessage("Please select an issue type.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setErrorMessage("Please log in to submit a report.");
        setSubmitting(false);
        return;
      }

      const imageUrls = await uploadImages(user.id);

      const { error } = await supabase.from("reports").insert([
        {
          user_id: user.id,
          title: issueType,
          waste_type: issueType,
          description: description,
          location_name: locationName,
          latitude: coords.lat,
          longitude: coords.lng,
          image_urls: imageUrls,
          severity: severity?.level || "Moderate",
          status: "Pending",
        },
      ]);

      if (error) {
        setErrorMessage(`Failed to submit report: ${error.message}`);
      } else {
        navigate("/my-reports");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to submit report.");
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

        <h1 className="text-lg font-black text-slate-900 tracking-wider uppercase">CERMS</h1>

        <div className="w-8" />
      </div>

      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-slate-900">Submit Waste Report</h2>
        <p className="text-xs text-slate-500 font-semibold">Please provide the details of the issue</p>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl text-center">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <select
            value={issueType}
            onChange={(e) => {
              setIssueType(e.target.value);
              if (images.length > 0) {
                setSeverity(analyzeSeverity(e.target.value, images.length));
              }
            }}
            required
            className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          >
            {ISSUE_TYPES.map((type) => (
              <option key={type} value={type} disabled={type === "Select issue type"}>
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
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the issue..."
            className="w-full p-4 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
          />
        </div>

        <div>
          <p className="text-center text-xs font-extrabold text-slate-900 mb-2">
            Upload Photo Maximum of 5
          </p>

          <div className="border-2 border-dashed border-slate-300 rounded-2xl p-6 bg-slate-50/50 hover:bg-slate-100/50 transition-all text-center relative">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="space-y-1.5 flex flex-col items-center justify-center">
              <FiCamera size={28} className="text-emerald-700" />
              <span className="text-xs font-extrabold text-slate-800 block">Choose File</span>
              <span className="text-[11px] text-slate-400 font-semibold block">JPG, PNG up to 1 GB</span>
            </div>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-5 gap-2 mt-3">
              {previews.map((src, idx) => (
                <div key={idx} className="relative h-16 rounded-xl overflow-hidden border border-slate-200 group">
                  <img src={src} alt="Upload preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/70 text-white rounded-full p-1 hover:bg-black transition-all"
                  >
                    <FiX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-1.5 text-center">
            Severity Level
          </label>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center space-y-1">
            {severity ? (
              <>
                <h4 className="text-sm font-black text-slate-900">
                  Identified as {severity.level === "High" ? "Severe" : severity.level}
                </h4>
                <p className="text-xs font-medium text-slate-600">
                  ({severity.explanation})
                </p>
              </>
            ) : (
              <p className="text-xs font-semibold text-slate-400">
                Upload a photo to automatically identify severity level
              </p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-900 mb-1.5">
            Map Pinpoint Location
          </label>
          <div className="h-56 w-full rounded-2xl overflow-hidden border border-slate-300 relative shadow-xs">
            <LocationPicker
              selectedLat={coords.lat}
              selectedLng={coords.lng}
              onLocationChange={handleLocationChange}
            />
          </div>
          <div className="mt-2 text-xs font-bold text-emerald-800 flex items-center gap-1.5">
            <FiMapPin size={14} />
            <span>Site: {locationName}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="py-3.5 px-4 bg-white border border-slate-300 hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl shadow-xs transition-all text-center disabled:opacity-50"
          >
            {savingDraft ? "SAVING..." : "SAVE AS DRAFT"}
          </button>

          <button
            type="submit"
            disabled={submitting}
            className="py-3.5 px-4 bg-black hover:bg-slate-900 text-white font-extrabold text-xs rounded-xl shadow-md transition-all text-center disabled:opacity-50"
          >
            {submitting ? "SUBMITTING..." : "SUBMIT REPORT"}
          </button>
        </div>
      </form>
    </div>
  );
}