import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { FiNavigation } from "react-icons/fi";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [8.361106, 124.8647778];
const TANKULAN_STRICT_BOUNDS: [[number, number], [number, number]] = [
  [8.3500, 124.8500],
  [8.3730, 124.8820]
];

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
  onLocationChange?: (lat: number, lng: number, addressName?: string) => void;
  onLocationSelect?: (coords: { lat: number; lng: number }, addressStr?: string) => void;
  onSelectLocation?: (coords: { lat: number; lng: number }, addressStr?: string) => void;
}

function getTankulanZone(lat: number, _lng: number, buildingName?: string) {
  let zoneName = "Purok 2a (52nd Engineer Brigade / Susohon)";

  if (lat > 8.365) {
    zoneName = "Purok 1 (Poblacion / Proper)";
  } else if (lat > 8.361) {
    zoneName = "Purok 2a (52nd Engineer Brigade / Susohon)";
  } else if (lat > 8.358) {
    zoneName = "Purok 4a (Kihare)";
  } else if (lat > 8.354) {
    zoneName = "Purok 4b (Mulberry Subdivision)";
  } else {
    zoneName = "Purok 6b (Mangima)";
  }

  if (buildingName && buildingName.length > 2 && !buildingName.includes("Road") && !buildingName.includes("Highway")) {
    return `${buildingName}, ${zoneName}, Barangay Tankulan, Manolo Fortich, Bukidnon`;
  }

  return `${zoneName}, Barangay Tankulan, Manolo Fortich, Bukidnon`;
}

function MapClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function RecenterOnChange({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { duration: 0.6 });
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
  const [lat, setLat] = useState<number>(selectedLat || TANKULAN_CENTER[0]);
  const [lng, setLng] = useState<number>(selectedLng || TANKULAN_CENTER[1]);
  const [exactAddress, setExactAddress] = useState<string>("Purok 2a (52nd Engineer Brigade / Susohon), Barangay Tankulan, Manolo Fortich, Bukidnon");
  const [tileType, setTileType] = useState<"street" | "satellite">("street");
  const [fetchingAddress, setFetchingAddress] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string>("");
  const markerRef = useRef<L.Marker>(null);

  const fetchRealAddress = async (targetLat: number, targetLng: number) => {
    try {
      setFetchingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}`
      );
      const data = await response.json();

      let place = "";
      if (data && data.address) {
        place = data.address.amenity || data.address.building || data.address.college || data.address.school || data.address.shop || "";
      }

      const formattedZoneAddress = getTankulanZone(targetLat, targetLng, place);
      setExactAddress(formattedZoneAddress);

      if (onLocationChange) onLocationChange(targetLat, targetLng, formattedZoneAddress);
      if (onLocationSelect) onLocationSelect({ lat: targetLat, lng: targetLng }, formattedZoneAddress);
      if (onSelectLocation) onSelectLocation({ lat: targetLat, lng: targetLng }, formattedZoneAddress);
    } catch (err) {
      const fallback = getTankulanZone(targetLat, targetLng);
      setExactAddress(fallback);

      if (onLocationChange) onLocationChange(targetLat, targetLng, fallback);
      if (onLocationSelect) onLocationSelect({ lat: targetLat, lng: targetLng }, fallback);
      if (onSelectLocation) onSelectLocation({ lat: targetLat, lng: targetLng }, fallback);
    } finally {
      setFetchingAddress(false);
    }
  };

  const updateCoordinates = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    fetchRealAddress(newLat, newLng);
  };

  useEffect(() => {
    if (selectedLat && selectedLng) {
      setLat(selectedLat);
      setLng(selectedLng);
      fetchRealAddress(selectedLat, selectedLng);
    } else {
      fetchRealAddress(lat, lng);
    }
  }, []);

  const handleMapClick = (newLat: number, newLng: number) => {
    updateCoordinates(newLat, newLng);
  };

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setLocationError("Geolocation isn't supported by this browser.");
      return;
    }

    setLocating(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateCoordinates(position.coords.latitude, position.coords.longitude);
        setLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Couldn't get your location. Please enable location access.");
        setLocating(false);
      }
    );
  }

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const latLng = marker.getLatLng();
          updateCoordinates(latLng.lat, latLng.lng);
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
          minZoom={16}
          maxZoom={19}
          maxBounds={TANKULAN_STRICT_BOUNDS}
          maxBoundsViscosity={1.0}
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
          <RecenterOnChange lat={lat} lng={lng} />

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
                  Pinpointed Zone Address
                </h4>
                <p className="text-[11px] font-bold text-emerald-800 mb-1 leading-snug">
                  {fetchingAddress ? "Identifying Zone..." : exactAddress}
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
            Official Barangay Zone & Address:
          </span>
          <h5 className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">
            {fetchingAddress ? "Identifying Zone..." : exactAddress}
          </h5>
        </div>
      </div>

      {locationError && (
        <p className="mt-2 text-xs text-red-600">{locationError}</p>
      )}
    </div>
  );
}