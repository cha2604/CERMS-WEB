import { useState, useEffect, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: [number, number] = [8.361106, 124.8647778];

const TANKULAN_BOUNDS: [[number, number], [number, number]] = [
  [8.3400, 124.8350],
  [8.3850, 124.8950]
];

const redPinIcon = L.divIcon({
  className: "custom-pin",
  html: `
    <div style="position: relative; width: 34px; height: 34px;">
      <div style="
        background-color: #ea4335;
        width: 34px;
        height: 34px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 12px;
          height: 12px;
          background: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 34],
  popupAnchor: [0, -34],
});

interface LocationPickerProps {
  selectedLat?: number;
  selectedLng?: number;
  onLocationChange?: (lat: number, lng: number) => void;
}

function MapClickHandler({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationPicker({
  selectedLat,
  selectedLng,
  onLocationChange,
}: LocationPickerProps) {
  const [lat, setLat] = useState<number>(selectedLat || TANKULAN_CENTER[0]);
  const [lng, setLng] = useState<number>(selectedLng || TANKULAN_CENTER[1]);
  const [tileType, setTileType] = useState<"street" | "satellite">("street");
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const markerRef = useRef<L.Marker>(null);

  const updateCoordinates = (newLat: number, newLng: number) => {
    setLat(newLat);
    setLng(newLng);
    if (onLocationChange) {
      onLocationChange(newLat, newLng);
    }
  };

  useEffect(() => {
    if (selectedLat && selectedLng) {
      setLat(selectedLat);
      setLng(selectedLng);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          updateCoordinates(userLat, userLng);
        },
        (error) => {
          console.error("GPS auto-detect error:", error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleUseMyLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          updateCoordinates(userLat, userLng);
          if (mapInstance) {
            mapInstance.flyTo([userLat, userLng], 17, {
              animate: true,
              duration: 1.2,
            });
          }
        },
        (error) => {
          console.error("GPS error:", error);
          alert("GPS Permission denied or unavailable. Tap on the map to set location.");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  const handleMapClick = (newLat: number, newLng: number) => {
    updateCoordinates(newLat, newLng);
    if (mapInstance) {
      mapInstance.panTo([newLat, newLng], { animate: true });
    }
  };

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

  const delta = 0.0012;
  const locationPhotoUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${lng - delta},${lat - delta},${lng + delta},${lat + delta}&bboxSR=4326&imageSR=4326&size=600,400&f=image`;

  return (
    <div className="relative h-96 w-full overflow-hidden rounded-2xl border border-slate-300 shadow-inner">
      <div className="absolute right-3 top-3 z-[1000] flex rounded-lg bg-white/95 p-1 shadow-md backdrop-blur-md border border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={handleUseMyLocation}
          className="mr-2 rounded-md px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-all font-bold shadow-sm"
        >
          Locate Me
        </button>
        <button
          type="button"
          onClick={() => setTileType("street")}
          className={`rounded-md px-2.5 py-1 transition-all ${
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
          className={`rounded-md px-2.5 py-1 transition-all ${
            tileType === "satellite"
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Satellite
        </button>
      </div>

      <MapContainer
        center={[lat, lng]}
        zoom={17}
        minZoom={14}
        maxZoom={18}
        maxBounds={TANKULAN_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
        ref={setMapInstance}
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

        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={[lat, lng]}
          icon={redPinIcon}
          ref={markerRef}
        >
          <Popup autoPan={true}>
            <div className="w-64 p-1 text-slate-800">
              <div className="relative mb-2 h-36 w-full overflow-hidden rounded-xl bg-slate-100 shadow-sm border border-slate-200">
                <img
                  src={locationPhotoUrl}
                  alt="Location aerial photo"
                  className="h-full w-full object-cover"
                />
                <span className="absolute top-2 left-2 rounded-full bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white shadow">
                  Pinpoint Area View
                </span>
              </div>

              <h4 className="font-extrabold text-slate-900 text-xs mb-0.5">
                Barangay Tankulan, Manolo Fortich
              </h4>

              <p className="text-[11px] text-slate-600 font-mono">
                Coordinates: <strong>{lat.toFixed(6)}, {lng.toFixed(6)}</strong>
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>

      <div className="absolute left-3 bottom-3 z-[1000] max-w-sm rounded-2xl bg-white/95 p-2.5 shadow-2xl backdrop-blur-md border border-slate-200 flex items-center gap-3">
        <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-200 border border-slate-300">
          <img
            src={locationPhotoUrl}
            alt="Pinpoint Location View"
            className="h-full w-full object-cover"
          />
        </div>

        <div className="min-w-0 flex-1">
          <h5 className="font-extrabold text-slate-900 text-xs truncate">
            Tankulan Location Pin
          </h5>
          <p className="text-[11px] text-slate-500 truncate">Tap map or drag pin</p>
          <p className="text-[10px] font-mono text-emerald-700 font-bold mt-0.5">
            {lat.toFixed(6)}, {lng.toFixed(6)}
          </p>
        </div>
      </div>
    </div>
  );
}