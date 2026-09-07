import { useState, useEffect, useRef, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { FiNavigation } from "react-icons/fi";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [8.361106, 124.8647778];

const redPinIcon = L.divIcon({
  className: "custom-pin",
  html: `
    <div style="position: relative; width: 30px; height: 30px;">
      <div style="
        background-color: #ea4335;
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 10px;
          height: 10px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    </div>
  `,
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -30],
});

export interface LocationPickerProps {
  selectedLat?: number;
  selectedLng?: number;
  onLocationChange?: (
    lat: number,
    lng: number,
    addressName?: string
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

interface ZoneBounds {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const PUROK_ZONES: ZoneBounds[] = [
  {
    name: "Purok 1 (Poblacion / Proper)",
    minLat: 8.3683,
    maxLat: 8.3733,
    minLng: 124.8551,
    maxLng: 124.8626,
  },
  {
    name: "Purok 2a (52nd Engineer Brigade / Susohon)",
    minLat: 8.3683,
    maxLat: 8.3733,
    minLng: 124.8626,
    maxLng: 124.8701,
  },
  {
    name: "Purok 2b (Binantalan)",
    minLat: 8.3683,
    maxLat: 8.3733,
    minLng: 124.8701,
    maxLng: 124.8776,
  },
  {
    name: "Purok 3a (Lower Kalanawan)",
    minLat: 8.3633,
    maxLat: 8.3683,
    minLng: 124.8551,
    maxLng: 124.8626,
  },
  {
    name: "Purok 3b (Upper Kalanawan)",
    minLat: 8.3633,
    maxLat: 8.3683,
    minLng: 124.8626,
    maxLng: 124.8701,
  },
  {
    name: "Purok 4a (Kihare)",
    minLat: 8.3608,
    maxLat: 8.3658,
    minLng: 124.8551,
    maxLng: 124.8626,
  },
  {
    name: "Purok 4b (Mulberry Subdivision)",
    minLat: 8.3608,
    maxLat: 8.3658,
    minLng: 124.8626,
    maxLng: 124.8701,
  },
  {
    name: "Purok 5 (Pol-oton)",
    minLat: 8.3558,
    maxLat: 8.3608,
    minLng: 124.8626,
    maxLng: 124.8701,
  },
  {
    name: "Purok 6a (Bliss)",
    minLat: 8.3558,
    maxLat: 8.3683,
    minLng: 124.8701,
    maxLng: 124.8801,
  },
  {
    name: "Purok 6b (Mangima)",
    minLat: 8.3483,
    maxLat: 8.3558,
    minLng: 124.8626,
    maxLng: 124.8801,
  },
];

function getTankulanZone(
  lat: number,
  lng: number,
  buildingName?: string
): string {
  const match = PUROK_ZONES.find(
    (zone) =>
      lat >= zone.minLat &&
      lat <= zone.maxLat &&
      lng >= zone.minLng &&
      lng <= zone.maxLng
  );

  const zoneName = match
    ? match.name
    : "Barangay Tankulan (unmapped zone)";

  if (
    buildingName &&
    buildingName.length > 2 &&
    !buildingName.includes("Road") &&
    !buildingName.includes("Highway")
  ) {
    return `${buildingName}, ${zoneName}, Barangay Tankulan, Manolo Fortich, Bukidnon`;
  }

  return `${zoneName}, Barangay Tankulan, Manolo Fortich, Bukidnon`;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
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
      duration: 0.6,
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
    typeof selectedLat === "number"
      ? selectedLat
      : TANKULAN_CENTER[0];

  const initialLng =
    typeof selectedLng === "number"
      ? selectedLng
      : TANKULAN_CENTER[1];

  const [lat, setLat] = useState<number>(initialLat);
  const [lng, setLng] = useState<number>(initialLng);

  const [exactAddress, setExactAddress] = useState<string>(
    "Barangay Tankulan, Manolo Fortich, Bukidnon"
  );

  const [tileType, setTileType] = useState<"street" | "satellite">(
    "street"
  );

  const [fetchingAddress, setFetchingAddress] =
    useState<boolean>(false);

  const [locating, setLocating] = useState<boolean>(false);

  const [locationError, setLocationError] = useState<string>("");

  const markerRef = useRef<L.Marker>(null);

  const notifyLocationChange = (
    targetLat: number,
    targetLng: number,
    address: string
  ) => {
    onLocationChange?.(targetLat, targetLng, address);
    onLocationSelect?.(
      { lat: targetLat, lng: targetLng },
      address
    );
    onSelectLocation?.(
      { lat: targetLat, lng: targetLng },
      address
    );
  };

  const fetchRealAddress = async (
    targetLat: number,
    targetLng: number
  ) => {
    try {
      setFetchingAddress(true);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&zoom=18&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to identify address.");
      }

      const data = await response.json();

      const address = data?.address || {};

      const place =
        address.amenity ||
        address.building ||
        address.college ||
        address.school ||
        address.shop ||
        address.tourism ||
        "";

      const formattedAddress = getTankulanZone(
        targetLat,
        targetLng,
        place
      );

      setExactAddress(formattedAddress);

      notifyLocationChange(
        targetLat,
        targetLng,
        formattedAddress
      );
    } catch {
      const fallback = getTankulanZone(
        targetLat,
        targetLng
      );

      setExactAddress(fallback);

      notifyLocationChange(
        targetLat,
        targetLng,
        fallback
      );
    } finally {
      setFetchingAddress(false);
    }
  };

  const updateCoordinates = (
    newLat: number,
    newLng: number
  ) => {
    setLat(newLat);
    setLng(newLng);
    fetchRealAddress(newLat, newLng);
  };

  useEffect(() => {
    if (
      typeof selectedLat === "number" &&
      typeof selectedLng === "number"
    ) {
      setLat(selectedLat);
      setLng(selectedLng);
      fetchRealAddress(selectedLat, selectedLng);
      return;
    }

    if (!navigator.geolocation) {
      fetchRealAddress(
        TANKULAN_CENTER[0],
        TANKULAN_CENTER[1]
      );
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        setLat(currentLat);
        setLng(currentLng);

        fetchRealAddress(currentLat, currentLng);

        setLocating(false);
      },
      () => {
        fetchRealAddress(
          TANKULAN_CENTER[0],
          TANKULAN_CENTER[1]
        );
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  }, []);

  const handleMapClick = (
    newLat: number,
    newLng: number
  ) => {
    updateCoordinates(newLat, newLng);
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation isn't supported by this browser."
      );
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = position.coords.latitude;
        const currentLng = position.coords.longitude;

        updateCoordinates(currentLat, currentLng);

        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);

        if (error.code === error.PERMISSION_DENIED) {
          setLocationError(
            "Location access was denied. Please allow location permission in your browser."
          );
        } else if (error.code === error.TIMEOUT) {
          setLocationError(
            "Getting your location timed out. Please try again."
          );
        } else {
          setLocationError(
            "Couldn't get your location. Please try again."
          );
        }

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

        if (marker) {
          const markerPosition = marker.getLatLng();

          updateCoordinates(
            markerPosition.lat,
            markerPosition.lng
          );
        }
      },
    }),
    []
  );

  return (
    <div>
      <div className="relative h-80 w-full overflow-hidden rounded-2xl border border-slate-300 shadow-inner">
        <div className="absolute right-2 top-2 z-[1000] flex rounded-lg bg-white/95 p-0.5 shadow-md border border-slate-200 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setTileType("street")}
            className={`rounded-md px-2 py-0.5 transition-all ${
              tileType === "street"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Map
          </button>

          <button
            type="button"
            onClick={() => setTileType("satellite")}
            className={`rounded-md px-2 py-0.5 transition-all ${
              tileType === "satellite"
                ? "bg-emerald-700 text-white shadow-sm"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Satellite
          </button>
        </div>

        <button
          type="button"
          onClick={handleUseMyLocation}
          disabled={locating}
          className="absolute left-2 top-2 z-[1000] flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-md border border-slate-200 transition-all hover:bg-emerald-50 disabled:opacity-60"
        >
          <FiNavigation size={12} />
          {locating ? "Locating..." : "Use My Location"}
        </button>

        <MapContainer
          center={[lat, lng]}
          zoom={17}
          minZoom={12}
          maxZoom={20}
          style={{ height: "100%", width: "100%" }}
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

          <MapClickHandler onSelect={handleMapClick} />

          <RecenterOnChange
            lat={lat}
            lng={lng}
          />

          <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[lat, lng]}
            icon={redPinIcon}
            ref={markerRef}
          >
            <Popup autoPan={true}>
              <div className="w-56 p-0.5 text-slate-800">
                <h4 className="font-extrabold text-slate-900 text-xs mb-1">
                  Selected Location
                </h4>

                <p className="text-[11px] font-bold text-emerald-800 mb-1 leading-snug">
                  {fetchingAddress
                    ? "Identifying Location..."
                    : exactAddress}
                </p>

                <p className="text-[10px] text-slate-500 font-mono border-t border-slate-100 pt-1">
                  {lat.toFixed(6)}, {lng.toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        <div className="absolute left-2 bottom-2 right-2 z-[1000] rounded-xl bg-white/90 p-2 shadow-lg border border-slate-200 flex flex-col gap-0.5">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
            Selected Location:
          </span>

          <h5 className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">
            {fetchingAddress
              ? "Identifying Location..."
              : exactAddress}
          </h5>

          <p className="text-[9px] text-slate-500 font-mono">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        </div>
      </div>

      {locationError && (
        <p className="mt-2 text-xs text-red-600">
          {locationError}
        </p>
      )}
    </div>
  );
}