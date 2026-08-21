import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiCamera, FiX, FiMapPin, FiSave } from "react-icons/fi";
import { supabase } from "../../lib/supabase";
import { submitReport } from "../../lib/ReportQueries";
import { saveDraft, getDraftById } from "../../lib/DraftQueries";
import { getProfile } from "../../lib/ProfileQueries";
import Button from "../../components/common/Button";
import LocationPicker from "../../components/Report/LocationPicker";
import ResidentLayout from "../../pages/resident/Layout";

const CATEGORIES = [
  "Illegal Dumping",
  "Clogged Drainage",
  "Littering",
  "Garbage on Vacant Lot",
  "Improper Waste Disposal",
  "Other",
];

const MAX_PHOTOS = 5;
const MAX_DESCRIPTION = 250;

export default function SubmitReport() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get("draft");

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    async function loadProfileContact() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const profile = await getProfile(user.id);
        setContactNumber(profile.contact_number || "");
      } catch (err) {
        console.error("Failed to load profile contact number:", err);
      }
    }

    loadProfileContact();
  }, []);

  useEffect(() => {
    if (!draftId) return;

    async function loadDraft() {
      try {
        const draft = await getDraftById(draftId as string);
        setCategory(draft.category || CATEGORIES[0]);
        setDescription(draft.description || "");
        if (draft.latitude && draft.longitude) {
          setCoords({ lat: draft.latitude, lng: draft.longitude });
        }
      } catch (err) {
        console.error("Failed to load draft:", err);
      }
    }

    loadDraft();
  }, [draftId]);

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS - photos.length;
    const filesToAdd = files.slice(0, remainingSlots);

    setPhotos((prev) => [...prev, ...filesToAdd]);
    setPhotoPreviews((prev) => [
      ...prev,
      ...filesToAdd.map((file) => URL.createObjectURL(file)),
    ]);

    e.target.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError(
          "Couldn't get your location. Please enable location access and try again."
        );
        setLocating(false);
      }
    );
  }

  async function handleSaveDraft() {
    setSavingDraft(true);
    setDraftMessage("");
    setErrorMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      await saveDraft(
        user.id,
        {
          category,
          description,
          contactNumber,
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
        },
        draftId ?? undefined
      );

      setDraftMessage("Draft saved. You can resume it from Draft Reports.");
    } catch (error) {
      console.error("Failed to save draft:", error);
      setErrorMessage("Couldn't save draft. Please try again.");
    } finally {
      setSavingDraft(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage("");

    if (photos.length === 0) {
      setErrorMessage("Please upload at least one photo before submitting.");
      return;
    }

    if (!coords) {
      setErrorMessage("Please set the report location on the map.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const profile = await getProfile(user.id);

      await submitReport({
        userId: user.id,
        category,
        description,
        contactNumber: profile.contact_number || contactNumber,
        latitude: coords.lat,
        longitude: coords.lng,
        photos,
      });

      navigate("/dashboard");
    } catch (error) {
      console.error("Failed to submit report:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to submit report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ResidentLayout title="Submit Report">
      <form onSubmit={handleSubmit} className="space-y-5 px-5 py-6">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Type of Waste Concern
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-100"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Description
            </label>
            <span className="text-xs text-gray-400">
              {description.length}/{MAX_DESCRIPTION}
            </span>
          </div>
          <textarea
            value={description}
            onChange={(e) =>
              setDescription(e.target.value.slice(0, MAX_DESCRIPTION))
            }
            placeholder="Please describe the waste concern..."
            rows={4}
            required
            className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-green-700 focus:ring-4 focus:ring-green-100"
          />
        </div>

        {!contactNumber && (
          <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            No contact number on file. Add one in your{" "}
            <a href="/profile" className="font-semibold underline">
              Profile
            </a>{" "}
            so admins can reach you about this report.
          </div>
        )}

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Upload Photo{" "}
            <span className="font-normal text-red-500">*required</span>{" "}
            <span className="font-normal text-gray-400">
              (Max {MAX_PHOTOS} photos)
            </span>
          </label>

          <div className="grid grid-cols-3 gap-3">
            {photoPreviews.map((src, index) => (
              <div
                key={index}
                className="relative aspect-square overflow-hidden rounded-xl border border-slate-200"
              >
                <img
                  src={src}
                  alt={`Upload ${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white transition hover:bg-black/80"
                >
                  <FiX size={14} />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-300 text-gray-400 transition hover:border-green-600 hover:text-green-600">
                <FiCamera size={22} />
                <span className="text-xs font-medium">Tap to upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <p className="mt-2 text-xs text-gray-400">
            Note: photos aren't saved in drafts. You'll need to re-add them
            when you resume this report.
          </p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-semibold text-slate-700">
              Location{" "}
              <span className="font-normal text-red-500">*required</span>
            </label>
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={locating}
              className="flex items-center gap-1 text-sm font-semibold text-green-700 hover:underline disabled:opacity-60"
            >
              <FiMapPin size={14} />
              {locating ? "Locating..." : "Use My Location"}
            </button>
          </div>

          <p className="mb-2 text-xs text-gray-500">
            Tap on the map to pinpoint the exact location. Map is limited to
            Barangay Tankulan, Manolo Fortich.
          </p>

          <LocationPicker coords={coords} onPick={setCoords} />

          {coords && (
            <p className="mt-2 text-xs text-gray-500">
              Selected: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </p>
          )}

          {locationError && (
            <p className="mt-2 text-xs text-red-600">{locationError}</p>
          )}
        </div>

        {draftMessage && (
          <div className="rounded-xl bg-green-50 p-4 text-center text-sm text-green-800">
            {draftMessage}
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl bg-red-50 p-4 text-center text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={savingDraft}
            className="flex items-center justify-center gap-2 rounded-xl border border-green-700 px-4 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50 disabled:opacity-60"
          >
            <FiSave size={16} />
            {savingDraft ? "Saving..." : "Save Draft"}
          </button>

          <Button type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </Button>
        </div>
      </form>
    </ResidentLayout>
  );
}