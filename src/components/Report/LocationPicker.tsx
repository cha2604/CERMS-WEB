import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { LatLngBoundsExpression, LatLngTuple } from "leaflet";
import "leaflet/dist/leaflet.css";

const TANKULAN_CENTER: LatLngTuple = [8.360839, 124.867628];
const TANKULAN_BOUNDS: LatLngBoundsExpression = [
  [8.3483, 124.8551],
  [8.3733, 124.8801],
];

const pinIcon = L.divIcon({
  className: "",
  html: `
    <svg width="32" height="42" viewBox="0 0 32 42" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.2 0 0 7.2 0 16c0 11 16 26 16 26s16-15 16-26c0-8.8-7.2-16-16-16z" fill="#16a34a"/>
      <circle cx="16" cy="16" r="6.5" fill="white"/>
    </svg>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
});

interface LocationPickerProps {
  coords: { lat: number; lng: number } | null;
  onPick: (coords: { lat: number; lng: number }) => void;
  height?: string;
}

function ClickHandler({
  onPick,
}: {
  onPick: (coords: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function ResizeFix() {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

function RecenterOnChange({
  coords,
}: {
  coords: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (coords) {
      map.flyTo([coords.lat, coords.lng], map.getZoom(), { duration: 0.6 });
    }
  }, [coords, map]);

  return null;
}

export default function LocationPicker({
  coords,
  onPick,
  height = "16rem",
}: LocationPickerProps) {
  return (
    <div
      className="overflow-hidden rounded-xl border border-slate-200"
      style={{ height, width: "100%" }}
    >
      <MapContainer
        center={coords ? [coords.lat, coords.lng] : TANKULAN_CENTER}
        zoom={17}
        minZoom={15}
        maxBounds={TANKULAN_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ResizeFix />
        <RecenterOnChange coords={coords} />
        <ClickHandler onPick={onPick} />
        {coords && (
          <Marker position={[coords.lat, coords.lng]} icon={pinIcon} />
        )}
      </MapContainer>
    </div>
  );
}