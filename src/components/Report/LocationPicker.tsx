
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { FiNavigation, FiMapPin } from "react-icons/fi";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [
  8.361106,
  124.8647778,
];

const TANKULAN_BOUNDS: L.LatLngBoundsExpression = [
  [8.3100, 124.8200],
  [8.4100, 124.9100],
];

const MAX_ACCEPTABLE_ACCURACY = 50;

const TANKULAN_AREAS = [
  "CENTRO",
  "TUMAMPONG",
  "ST. JOSEPH",
  "MULBERRY",
  "MANGIMA",
  "LOWER KALANAWAN",
  "UPPER KALANAWAN",
  "PROPER KALANAWAN",
  "UPPER POL-OTON",
  "LOWER POL-OTON",
  "KIHARE",
  "LOWER SOSOHON",
  "UPPER SOSOHON",
] as const;

const reportPinIcon = L.divIcon({
  className: "cer-ms-report-pin",
  html: `
    <div style="position:relative;width:32px;height:38px;">
      <div style="position:absolute;left:1px;top:0;width:30px;height:30px;background:#dc2626;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;">
        <div style="width:9px;height:9px;background:#fff;border-radius:50%;"></div>
      </div>
    </div>
  `,
  iconSize: [32, 38],
  iconAnchor: [16, 36],
  popupAnchor: [0, -36],
});

export interface LocationPickerProps {
  selectedLat?: number;
  selectedLng?: number;
  onLocationChange?: (
    lat: number,
    lng: number,
    addressName?: string,
    communityArea?: string
  ) => void;
  onLocationSelect?: (
    coords: { lat: number; lng: number },
    addressStr?: string
  ) => void;
  onSelectLocation?: (
    coords: { lat: number; lng: number },
    addressStr?: string
  ) => void;
}

function normalizeText(value: string) {
  return value
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findCommunityArea(text: string) {
  const normalized = normalizeText(text);

  return (
    TANKULAN_AREAS.find((area) =>
      normalized.includes(normalizeText(area))
    ) || ""
  );
}

function isWithinTankulan(lat: number, lng: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= 8.3100 &&
    lat <= 8.4100 &&
    lng >= 124.8200 &&
    lng <= 124.9100
  );
}

function RecenterOnChange({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), {
      duration: 0.5,
    });
  }, [lat, lng, map]);

  return null;
}

export default function LocationPicker({
  selectedLat,
  selectedLng,
  onLocationChange,
  onLocationSelect,
  onSelectLocation,
}: LocationPickerProps) {
  const initialSelectedLocation = useRef(
    typeof selectedLat === "number" &&
      typeof selectedLng === "number" &&
      isWithinTankulan(selectedLat, selectedLng)
      ? {
          lat: selectedLat,
          lng: selectedLng,
        }
      : null
  );

  const callbacksRef = useRef({
    onLocationChange,
    onLocationSelect,
    onSelectLocation,
  });

  callbacksRef.current = {
    onLocationChange,
    onLocationSelect,
    onSelectLocation,
  };

  const [lat, setLat] = useState(
    initialSelectedLocation.current?.lat ??
      TANKULAN_CENTER[0]
  );

  const [lng, setLng] = useState(
    initialSelectedLocation.current?.lng ??
      TANKULAN_CENTER[1]
  );

  const [locationReady, setLocationReady] = useState(
    initialSelectedLocation.current !== null
  );

  const [reportAddress, setReportAddress] = useState(
    initialSelectedLocation.current
      ? "Identifying selected location..."
      : "Waiting for GPS location..."
  );

  const [communityArea, setCommunityArea] = useState(
    initialSelectedLocation.current
      ? "Barangay Tankulan"
      : ""
  );

  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [locationError, setLocationError] = useState("");

  const [tileType, setTileType] = useState<"street" | "satellite">("street");

  const locationRequestRef = useRef(0);
  const geocodeRequestRef = useRef(0);

  const notifyParent = useCallback(
    (
      targetLat: number,
      targetLng: number,
      address: string,
      area: string
    ) => {
      callbacksRef.current.onLocationChange?.(
        targetLat,
        targetLng,
        address,
        area
      );

      callbacksRef.current.onLocationSelect?.(
        { lat: targetLat, lng: targetLng },
        address
      );

      callbacksRef.current.onSelectLocation?.(
        { lat: targetLat, lng: targetLng },
        address
      );
    },
    []
  );

  const reverseGeocode = useCallback(
    async (targetLat: number, targetLng: number) => {
      if (!isWithinTankulan(targetLat, targetLng)) {
        return;
      }

      const requestId = ++geocodeRequestRef.current;

      setFetchingAddress(true);

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
          {
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Address lookup failed.");
        }

        const data = await response.json();

        if (requestId !== geocodeRequestRef.current) {
          return;
        }

        const addressObj = data?.address || {};

        const road =
          addressObj.road ||
          addressObj.street ||
          addressObj.pedestrian ||
          addressObj.building ||
          "";

        const suburb =
          addressObj.suburb ||
          addressObj.neighbourhood ||
          addressObj.village ||
          addressObj.hamlet ||
          "";

        const city =
          addressObj.city ||
          addressObj.town ||
          addressObj.municipality ||
          "Manolo Fortich";

        const province =
          addressObj.state ||
          addressObj.province ||
          "Bukidnon";

        const postcode = addressObj.postcode || "8705";

        const detectedArea = findCommunityArea(
          `${data?.display_name || ""} ${road} ${suburb}`
        );

        const parts = [
          road,
          suburb || (detectedArea ? `Purok ${detectedArea}` : ""),
          city,
          province,
          postcode,
        ].filter(Boolean);

        const displayAddress =
          Array.from(new Set(parts)).join(", ") ||
          "Barangay Tankulan, Manolo Fortich, Bukidnon 8705";

        const finalArea =
          detectedArea || "Barangay Tankulan";

        setReportAddress(displayAddress);
        setCommunityArea(finalArea);

        notifyParent(
          targetLat,
          targetLng,
          displayAddress,
          finalArea
        );
      } catch {
        if (requestId !== geocodeRequestRef.current) {
          return;
        }

        const fallbackAddress =
          "Barangay Tankulan, Manolo Fortich, Bukidnon 8705";

        setReportAddress(fallbackAddress);
        setCommunityArea("Barangay Tankulan");

        notifyParent(
          targetLat,
          targetLng,
          fallbackAddress,
          "Barangay Tankulan"
        );
      } finally {
        if (requestId === geocodeRequestRef.current) {
          setFetchingAddress(false);
        }
      }
    },
    [notifyParent]
  );

  const updateReportLocation = useCallback(
    (
      targetLat: number,
      targetLng: number,
      targetAccuracy: number | null
    ) => {
      if (!isWithinTankulan(targetLat, targetLng)) {
        setLocationError(
          "Your current GPS position is outside the allowed Tankulan map area."
        );
        setLocationReady(false);
        return;
      }

      setLocationError("");
      setLat(targetLat);
      setLng(targetLng);
      setAccuracy(targetAccuracy);
      setLocationReady(true);

      const fallbackAddress =
        "Barangay Tankulan, Manolo Fortich, Bukidnon 8705";

      notifyParent(
        targetLat,
        targetLng,
        fallbackAddress,
        "Barangay Tankulan"
      );

      void reverseGeocode(targetLat, targetLng);
    },
    [notifyParent, reverseGeocode]
  );

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError(
        "Your browser does not support GPS location."
      );
      return;
    }

    const requestId = ++locationRequestRef.current;

    setLocating(true);
    setLocationError("");
    setAccuracy(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (requestId !== locationRequestRef.current) {
          return;
        }

        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;
        const currentAccuracy = position.coords.accuracy;

        if (!isWithinTankulan(currentLat, currentLng)) {
          setLocating(false);
          setLocationError(
            "Your GPS position appears outside Barangay Tankulan. Please check your location settings and try again."
          );
          return;
        }

        const validAccuracy = Number.isFinite(currentAccuracy)
          ? currentAccuracy
          : null;

        setLocating(false);

        updateReportLocation(
          currentLat,
          currentLng,
          validAccuracy
        );
      },
      (error) => {
        if (requestId !== locationRequestRef.current) {
          return;
        }

        setLocating(false);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location permission was denied. Please allow location access in your browser settings."
          );
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          setLocationError(
            "Your device could not determine its location. Please check your GPS settings."
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationError(
            "Getting your GPS location took too long. Please tap Refresh Location and try again."
          );
        } else {
          setLocationError(
            "Unable to retrieve your current location. Please try again."
          );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  }, [updateReportLocation]);

  const handleRefreshLocation = () => {
    getCurrentLocation();
  };

  useEffect(() => {
    if (initialSelectedLocation.current) {
      updateReportLocation(
        initialSelectedLocation.current.lat,
        initialSelectedLocation.current.lng,
        null
      );
    } else {
      getCurrentLocation();
    }

    return () => {
      locationRequestRef.current++;
      geocodeRequestRef.current++;
    };
  }, [getCurrentLocation, updateReportLocation]);

  const accuracyWarning =
    accuracy !== null &&
    accuracy > MAX_ACCEPTABLE_ACCURACY;

  return (
    <div className="space-y-3">
      <div className="relative z-0 h-64 w-full overflow-hidden rounded-2xl border border-slate-300 shadow-inner sm:h-80">
        <div className="pointer-events-auto absolute left-2 top-2 z-[40]">
          <button
            type="button"
            onClick={handleRefreshLocation}
            disabled={locating}
            className="rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-[11px] font-bold text-emerald-800 shadow-md transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1.5">
              <FiNavigation size={13} />
              {locating ? "Getting Location..." : "Refresh Location"}
            </span>
          </button>
        </div>

        <div className="pointer-events-auto absolute right-2 top-2 z-[40] flex rounded-lg border border-slate-200 bg-white/95 p-0.5 text-[11px] font-bold shadow-md">
          <button
            type="button"
            onClick={() => setTileType("street")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              tileType === "street"
                ? "bg-emerald-700 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Map
          </button>

          <button
            type="button"
            onClick={() => setTileType("satellite")}
            className={`rounded-md px-3 py-1.5 transition-all ${
              tileType === "satellite"
                ? "bg-emerald-700 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Satellite
          </button>
        </div>

        <MapContainer
          center={[lat, lng]}
          zoom={16}
          minZoom={14}
          maxZoom={19}
          maxBounds={TANKULAN_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          style={{
            height: "100%",
            width: "100%",
          }}
        >
          {tileType === "street" ? (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          ) : (
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}

          <RecenterOnChange lat={lat} lng={lng} />

          {locationReady && accuracy !== null && (
            <Circle
              center={[lat, lng]}
              radius={Math.max(accuracy, 5)}
              pathOptions={{
                color: "#2563eb",
                fillColor: "#3b82f6",
                fillOpacity: 0.13,
                weight: 2,
              }}
            />
          )}

          {locationReady && (
            <Marker
              position={[lat, lng]}
              icon={reportPinIcon}
              draggable={false}
              keyboard={false}
            />
          )}
        </MapContainer>

        {!locationReady && (
          <div className="pointer-events-none absolute inset-0 z-[20] flex items-center justify-center bg-white/30">
            <div className="rounded-xl bg-white/95 px-4 py-3 text-center shadow-lg">
              <FiNavigation
                size={22}
                className="mx-auto animate-pulse text-emerald-700"
              />

              <p className="mt-2 text-xs font-extrabold text-slate-800">
                {locating
                  ? "Getting your GPS location..."
                  : "Waiting for GPS location..."}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full border-2 border-white bg-red-600 shadow" />
            Current device location
          </span>

          {locationReady && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-600" />
              Location detected
            </span>
          )}
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Current Location Address
          </p>

          <p className="mt-1 text-xs font-extrabold leading-5 text-slate-900">
            {fetchingAddress
              ? "Identifying your location..."
              : locationReady
                ? reportAddress
                : "Waiting for your device GPS location..."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Community Area
            </p>

            <p className="mt-1 text-xs font-black text-emerald-800">
              {locationReady
                ? communityArea || "Barangay Tankulan"
                : "Waiting for GPS..."}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              GPS Coordinates
            </p>

            <p className="mt-1 font-mono text-[10px] font-black text-slate-800">
              {locationReady
                ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
                : "Not available yet"}
            </p>
          </div>
        </div>

        {accuracy !== null && (
          <div
            className={`rounded-xl border p-3 ${
              accuracyWarning
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <p
              className={`text-xs font-extrabold ${
                accuracyWarning
                  ? "text-amber-800"
                  : "text-emerald-800"
              }`}
            >
              GPS Accuracy: ±{Math.round(accuracy)} meters
            </p>

            <p
              className={`mt-1 text-[11px] leading-relaxed ${
                accuracyWarning
                  ? "text-amber-700"
                  : "text-emerald-700"
              }`}
            >
              {accuracyWarning
                ? "Your device is providing an approximate location. Enable Precise Location and try refreshing your GPS in an open area."
                : "Your device is currently providing a more accurate location estimate."}
            </p>
          </div>
        )}

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-start gap-2">
            <FiMapPin
              size={16}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-800">
                Automatic Location
              </p>

              <p className="mt-1 text-xs leading-relaxed text-emerald-900">
                CERMS detects your location once using your device GPS. The marker stays in place and cannot be dragged. Use Refresh Location to obtain a new GPS reading.
              </p>
            </div>
          </div>
        </div>
      </div>

      {locationError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-semibold leading-relaxed text-rose-700">
            {locationError}
          </p>
        </div>
      )}
    </div>
  );
}
