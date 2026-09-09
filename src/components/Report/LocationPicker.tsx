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

const TANKULAN_CENTER: [number, number] = [
  8.361106,
  124.8647778,
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
  enabled,
}: {
  lat: number;
  lng: number;
  enabled: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!enabled) return;

    map.flyTo([lat, lng], map.getZoom(), {
      duration: 0.6,
    });
  }, [lat, lng, map, enabled]);

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

  const [tileType, setTileType] = useState<
    "street" | "satellite"
  >("street");

  const [fetchingAddress, setFetchingAddress] =
    useState<boolean>(false);

  const [locating, setLocating] =
    useState<boolean>(false);

  const [locationError, setLocationError] =
    useState<string>("");

  const [isTracking, setIsTracking] =
    useState<boolean>(true);

  const [accuracy, setAccuracy] =
    useState<number | null>(null);

  const markerRef = useRef<L.Marker>(null);
  const watchIdRef = useRef<number | null>(null);
  const addressTimeoutRef =
    useRef<number | null>(null);
  const lastAddressCoordsRef = useRef<{
    lat: number;
    lng: number;
  } | null>(null);

  const notifyLocationChange = (
    targetLat: number,
    targetLng: number,
    address: string
  ) => {
    onLocationChange?.(
      targetLat,
      targetLng,
      address
    );

    onLocationSelect?.(
      {
        lat: targetLat,
        lng: targetLng,
      },
      address
    );

    onSelectLocation?.(
      {
        lat: targetLat,
        lng: targetLng,
      },
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
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${targetLat}&lon=${targetLng}&zoom=19&addressdetails=1`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to identify the selected location."
        );
      }

      const data = await response.json();

      const formattedAddress =
        data?.display_name ||
        "Barangay Tankulan, Manolo Fortich, Bukidnon";

      setExactAddress(
        formattedAddress
      );

      notifyLocationChange(
        targetLat,
        targetLng,
        formattedAddress
      );

      lastAddressCoordsRef.current = {
        lat: targetLat,
        lng: targetLng,
      };
    } catch (error) {
      console.error(
        "Reverse geocoding error:",
        error
      );

      const fallback =
        "Barangay Tankulan, Manolo Fortich, Bukidnon";

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

  const scheduleAddressUpdate = (
    targetLat: number,
    targetLng: number
  ) => {
    if (
      lastAddressCoordsRef.current
    ) {
      const previous =
        lastAddressCoordsRef.current;

      const latDifference =
        Math.abs(
          targetLat - previous.lat
        );

      const lngDifference =
        Math.abs(
          targetLng - previous.lng
        );

      if (
        latDifference < 0.00015 &&
        lngDifference < 0.00015
      ) {
        return;
      }
    }

    if (
      addressTimeoutRef.current
    ) {
      window.clearTimeout(
        addressTimeoutRef.current
      );
    }

    addressTimeoutRef.current =
      window.setTimeout(() => {
        fetchRealAddress(
          targetLat,
          targetLng
        );
      }, 1200);
  };

  const updateCoordinates = (
    newLat: number,
    newLng: number,
    shouldFollow = true,
    shouldFetchAddress = true
  ) => {
    setLat(newLat);
    setLng(newLng);

    if (shouldFetchAddress) {
      scheduleAddressUpdate(
        newLat,
        newLng
      );
    }

    if (shouldFollow) {
      setIsTracking(true);
    }
  };

  const stopTracking = () => {
    if (
      watchIdRef.current !== null
    ) {
      navigator.geolocation.clearWatch(
        watchIdRef.current
      );

      watchIdRef.current = null;
    }

    setIsTracking(false);
    setLocating(false);
  };

  const startTracking = () => {
    if (!navigator.geolocation) {
      setLocationError(
        "Geolocation isn't supported by this browser."
      );
      return;
    }

    if (
      watchIdRef.current !== null
    ) {
      return;
    }

    setIsTracking(true);
    setLocating(true);
    setLocationError("");

    const watchId =
      navigator.geolocation.watchPosition(
        (position) => {
          const currentLat =
            position.coords.latitude;

          const currentLng =
            position.coords.longitude;

          setLat(currentLat);
          setLng(currentLng);

          setAccuracy(
            position.coords.accuracy
          );

          setLocating(false);

          scheduleAddressUpdate(
            currentLat,
            currentLng
          );
        },
        (error) => {
          console.error(
            "Live location error:",
            error
          );

          setLocating(false);

          if (
            error.code ===
            error.PERMISSION_DENIED
          ) {
            setLocationError(
              "Location access was denied. Please allow location permission in your browser."
            );
          } else if (
            error.code ===
            error.TIMEOUT
          ) {
            setLocationError(
              "Getting your live location timed out. Please try again."
            );
          } else {
            setLocationError(
              "Unable to track your live location."
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        }
      );

    watchIdRef.current =
      watchId;
  };

  useEffect(() => {
    if (
      typeof selectedLat === "number" &&
      typeof selectedLng === "number"
    ) {
      setLat(selectedLat);
      setLng(selectedLng);
      setIsTracking(false);

      fetchRealAddress(
        selectedLat,
        selectedLng
      );

      return () => {
        if (
          addressTimeoutRef.current
        ) {
          window.clearTimeout(
            addressTimeoutRef.current
          );
        }
      };
    }

    startTracking();

    return () => {
      if (
        watchIdRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }

      if (
        addressTimeoutRef.current
      ) {
        window.clearTimeout(
          addressTimeoutRef.current
        );
      }
    };
  }, []);

  const handleMapClick = (
    newLat: number,
    newLng: number
  ) => {
    stopTracking();

    updateCoordinates(
      newLat,
      newLng,
      false,
      true
    );
  };

  const handleUseMyLocation = () => {
    startTracking();
  };

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker =
          markerRef.current;

        if (!marker) return;

        const markerPosition =
          marker.getLatLng();

        stopTracking();

        updateCoordinates(
          markerPosition.lat,
          markerPosition.lng,
          false,
          true
        );
      },
    }),
    []
  );

  return (
    <div className="relative z-0 isolate">
      <div className="relative z-0 h-80 w-full overflow-hidden rounded-2xl border border-slate-300 shadow-inner">
        <div className="absolute right-2 top-2 z-[500] flex rounded-lg bg-white/95 p-0.5 shadow-md border border-slate-200 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() =>
              setTileType("street")
            }
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
            onClick={() =>
              setTileType("satellite")
            }
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
          onClick={
            handleUseMyLocation
          }
          disabled={locating}
          className="absolute left-2 top-2 z-[500] flex items-center gap-1.5 rounded-lg bg-white/95 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-md border border-slate-200 transition-all hover:bg-emerald-50 disabled:opacity-60"
        >
          <FiNavigation size={12} />

          {locating
            ? "Locating..."
            : isTracking
            ? "Tracking"
            : "Track My Location"}
        </button>

        <MapContainer
          center={[lat, lng]}
          zoom={18}
          minZoom={15}
          maxZoom={21}
          style={{
            height: "100%",
            width: "100%",
            zIndex: 0,
          }}
          className="relative z-0"
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

          <MapClickHandler
            onSelect={handleMapClick}
          />

          <RecenterOnChange
            lat={lat}
            lng={lng}
            enabled={isTracking}
          />

          <Marker
            draggable={!isTracking}
            eventHandlers={
              eventHandlers
            }
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
                  {lat.toFixed(6)},{" "}
                  {lng.toFixed(6)}
                </p>

                {accuracy !== null && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    GPS accuracy: ±
                    {Math.round(
                      accuracy
                    )}{" "}
                    m
                  </p>
                )}

                {isTracking && (
                  <p className="text-[10px] text-emerald-700 font-bold mt-1">
                    Live location tracking active
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        <div className="absolute left-2 bottom-2 right-2 z-[500] rounded-xl bg-white/90 p-2 shadow-lg border border-slate-200 flex flex-col gap-0.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">
              Selected Location:
            </span>

            {isTracking && (
              <span className="text-[9px] font-extrabold text-emerald-700">
                LIVE
              </span>
            )}
          </div>

          <h5 className="font-extrabold text-slate-900 text-[11px] leading-tight truncate">
            {fetchingAddress
              ? "Identifying Location..."
              : exactAddress}
          </h5>

          <p className="text-[9px] text-slate-500 font-mono">
            {lat.toFixed(6)},{" "}
            {lng.toFixed(6)}
          </p>

          {accuracy !== null && (
            <p className="text-[9px] text-slate-400">
              GPS accuracy: ±
              {Math.round(accuracy)} m
            </p>
          )}
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