import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { FiNavigation } from "react-icons/fi";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [
  8.361106,
  124.8647778,
];

const TANKULAN_BOUNDS: L.LatLngBoundsExpression = [
  [8.3100, 124.8200],
  [8.4100, 124.9100],
];

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
  return lat >= 8.3100 && lat <= 8.4100 && lng >= 124.8200 && lng <= 124.9100;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(
        event.latlng.lat,
        event.latlng.lng
      );
    },
  });

  return null;
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
  const initialLat =
    typeof selectedLat === "number" && isWithinTankulan(selectedLat, selectedLng || 0)
      ? selectedLat
      : TANKULAN_CENTER[0];

  const initialLng =
    typeof selectedLng === "number" && isWithinTankulan(selectedLat || 0, selectedLng)
      ? selectedLng
      : TANKULAN_CENTER[1];

  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);

  const [currentLocation, setCurrentLocation] =
    useState<{ lat: number; lng: number } | null>(null);

  const [reportAddress, setReportAddress] =
    useState("Barangay Tankulan, Manolo Fortich, Bukidnon");

  const [communityArea, setCommunityArea] =
    useState("");

  const [fetchingAddress, setFetchingAddress] =
    useState(false);

  const [locating, setLocating] =
    useState(false);

  const [locationError, setLocationError] =
    useState("");

  const [tileType, setTileType] =
    useState<"street" | "satellite">("street");

  const markerRef = useRef<L.Marker>(null);

  const notifyParent = (
    targetLat: number,
    targetLng: number,
    address: string,
    area: string
  ) => {
    onLocationChange?.(
      targetLat,
      targetLng,
      address,
      area
    );

    onLocationSelect?.(
      { lat: targetLat, lng: targetLng },
      address
    );

    onSelectLocation?.(
      { lat: targetLat, lng: targetLng },
      address
    );
  };

  const reverseGeocode = async (
    targetLat: number,
    targetLng: number
  ) => {
    if (!isWithinTankulan(targetLat, targetLng)) {
      setLocationError("Selected position is outside Barangay Tankulan boundary.");
      return;
    }

    setLocationError("");
    setFetchingAddress(true);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1&bounded=1&viewbox=124.8200,8.4100,124.9100,8.3100`,
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
      const addressObj = data?.address || {};

      const road = addressObj.road || addressObj.street || addressObj.pedestrian || addressObj.building || "";
      const suburb = addressObj.suburb || addressObj.neighbourhood || addressObj.village || addressObj.hamlet || "";
      const detectedArea = findCommunityArea(`${data?.display_name || ""} ${road} ${suburb}`);

      const parts = [
        road,
        suburb || (detectedArea ? `Purok ${detectedArea}` : ""),
        "Barangay Tankulan",
        "Manolo Fortich",
        "Bukidnon",
      ].filter(Boolean);

      const uniqueParts = Array.from(new Set(parts));
      const displayAddress = uniqueParts.join(", ");

      setReportAddress(displayAddress);
      setCommunityArea(detectedArea || "Barangay Tankulan");

      notifyParent(
        targetLat,
        targetLng,
        displayAddress,
        detectedArea || "Barangay Tankulan"
      );
    } catch {
      const fallbackAddress = "Barangay Tankulan, Manolo Fortich, Bukidnon";
      setReportAddress(fallbackAddress);
      setCommunityArea("Barangay Tankulan");

      notifyParent(
        targetLat,
        targetLng,
        fallbackAddress,
        "Barangay Tankulan"
      );
    } finally {
      setFetchingAddress(false);
    }
  };

  const updateReportLocation = (
    targetLat: number,
    targetLng: number
  ) => {
    const clampedLat = Math.min(Math.max(targetLat, 8.3100), 8.4100);
    const clampedLng = Math.min(Math.max(targetLng, 124.8200), 124.9100);

    setLat(clampedLat);
    setLng(clampedLng);
    reverseGeocode(
      clampedLat,
      clampedLng
    );
  };

  useEffect(() => {
    let cancelled = false;

    async function initializeLocation() {
      if (
        typeof selectedLat === "number" &&
        typeof selectedLng === "number" &&
        isWithinTankulan(selectedLat, selectedLng)
      ) {
        setLat(selectedLat);
        setLng(selectedLng);
        await reverseGeocode(
          selectedLat,
          selectedLng
        );
      }

      if (!navigator.geolocation) {
        return;
      }

      setLocating(true);
      setLocationError("");

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelled) return;

          const currentLat = position.coords.latitude;
          const currentLng = position.coords.longitude;

          if (isWithinTankulan(currentLat, currentLng)) {
            setCurrentLocation({
              lat: currentLat,
              lng: currentLng,
            });

            if (
              typeof selectedLat !== "number" ||
              typeof selectedLng !== "number"
            ) {
              setLat(currentLat);
              setLng(currentLng);
              await reverseGeocode(
                currentLat,
                currentLng
              );
            }
          }

          setLocating(false);
        },
        () => {
          if (!cancelled) {
            setLocating(false);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );
    }

    initializeLocation();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        if (!isWithinTankulan(currentLat, currentLng)) {
          setLocationError("Your current GPS position is outside Barangay Tankulan boundary.");
          setLocating(false);
          return;
        }

        setCurrentLocation({
          lat: currentLat,
          lng: currentLng,
        });

        updateReportLocation(
          currentLat,
          currentLng
        );

        setLocating(false);
      },
      () => {
        setLocationError(
          "Couldn't get your current location. Please allow location access and try again."
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (!marker) return;

        const position = marker.getLatLng();
        updateReportLocation(
          position.lat,
          position.lng
        );
      },
    }),
    []
  );

  return (
    <div className="space-y-3">
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-slate-300 shadow-inner">
        <div className="absolute left-2 top-2 z-[1000] flex gap-2">
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={locating}
            className="rounded-lg bg-white/95 px-3 py-2 text-[11px] font-bold text-emerald-800 shadow-md border border-slate-200 hover:bg-emerald-50 disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-1.5">
              <FiNavigation size={12} />
              {locating
                ? "Locating..."
                : "My Location"}
            </span>
          </button>
        </div>

        <div className="absolute right-2 top-2 z-[1000] flex rounded-lg bg-white/95 p-0.5 shadow-md border border-slate-200 text-[11px] font-bold">
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

          <MapClickHandler onSelect={updateReportLocation} />

          <RecenterOnChange lat={lat} lng={lng} />

          {currentLocation && (
            <CircleMarker
              center={[
                currentLocation.lat,
                currentLocation.lng,
              ]}
              radius={7}
              pathOptions={{
                color: "#ffffff",
                fillColor: "#2563eb",
                fillOpacity: 0.95,
                weight: 3,
              }}
            />
          )}

          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[lat, lng]}
            icon={reportPinIcon}
            ref={markerRef}
          />
        </MapContainer>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-600 border-2 border-white shadow" />
            Your current location
          </span>

          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-600 border-2 border-white shadow" />
            Waste report location (Drag pin within Tankulan)
          </span>
        </div>

        <div>
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
            Report Address (Barangay Tankulan)
          </p>

          <p className="mt-1 text-xs font-extrabold leading-5 text-slate-900">
            {fetchingAddress
              ? "Identifying location in Tankulan..."
              : reportAddress}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Community Area
            </p>

            <p className="mt-1 text-xs font-black text-emerald-800">
              {communityArea || "Barangay Tankulan"}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">
              Coordinates
            </p>

            <p className="mt-1 font-mono text-[10px] font-black text-slate-800">
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </p>
          </div>
        </div>
      </div>

      {locationError && (
        <p className="text-xs font-semibold text-rose-600">
          {locationError}
        </p>
      )}
    </div>
  );
}