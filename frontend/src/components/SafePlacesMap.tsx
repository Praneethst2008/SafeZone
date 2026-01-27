import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ================= ICONS ================= */
const userIcon = new L.Icon({
  iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const policeIcon = new L.Icon({
  iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/police.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const hospitalIcon = new L.Icon({
  iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/hospitals.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const fireIcon = new L.Icon({
  iconUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/firedept.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const getIconByType = (type: string) => {
  switch (type) {
    case "police":
      return policeIcon;
    case "hospital":
      return hospitalIcon;
    case "fire_station":
      return fireIcon;
    default:
      return policeIcon;
  }
};

/* ================= TYPES ================= */
type Place = {
  id: number;
  lat: number;
  lon: number;
  name: string;
  type: string;
};

type Props = {
  lat: number;
  lng: number;
};

const SafePlacesMap = ({ lat, lng }: Props) => {
  const [places, setPlaces] = useState<Place[]>([]);
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  const getDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};


useEffect(() => {
  const onSOS = () => {
    if (!places.length) return;

    let nearest = places[0];
    let minDistance = getDistance(
      lat,
      lng,
      places[0].lat,
      places[0].lon
    );

    for (const p of places) {
      const d = getDistance(lat, lng, p.lat, p.lon);
      if (d < minDistance) {
        minDistance = d;
        nearest = p;
      }
    }

    console.warn("🚨 SOS → Auto-routing to nearest safe place:", nearest.name);

    drawRoute(nearest.lat, nearest.lon);
  };

  window.addEventListener("sos-confirmed", onSOS);
  return () =>
    window.removeEventListener("sos-confirmed", onSOS);
}, [places, lat, lng]);


  /* ================= FETCH SAFE PLACES ================= */
  useEffect(() => {
    const fetchPlaces = async () => {
      try {
        const query = `
          [out:json];
          (
            node["amenity"="police"](around:2000,${lat},${lng});
            node["amenity"="hospital"](around:2000,${lat},${lng});
            node["amenity"="fire_station"](around:2000,${lat},${lng});
          );
          out;
        `;

        const res = await fetch(
          "https://overpass-api.de/api/interpreter",
          { method: "POST", body: query }
        );

        const text = await res.text();
        if (!text.startsWith("{")) return;

        const data = JSON.parse(text);

        setPlaces(
          data.elements.map((e: any) => ({
            id: e.id,
            lat: e.lat,
            lon: e.lon,
            name: e.tags?.name || "Unnamed",
            type: e.tags?.amenity,
          }))
        );
      } catch {
        console.warn("Overpass unavailable");
      }
    };

    fetchPlaces();
  }, [lat, lng]);

  /* ================= ROUTE (OSRM) ================= */
  const drawRoute = async (destLat: number, destLng: number) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${lng},${lat};${destLng},${destLat}?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const data = await res.json();

      const coords = data.routes[0].geometry.coordinates.map(
        ([lon, lat]: [number, number]) => [lat, lon]
      );

      setRouteCoords(coords);
    } catch {
      console.error("Route fetch failed");
    }
  };

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      className="h-64 w-full rounded-xl z-0"
    >
      <TileLayer
        attribution="© OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* 👤 USER */}
      <Marker
        position={[lat, lng]}
        icon={userIcon}
        eventHandlers={{
          click: () => setRouteCoords([]),
        }}
      >
        <Tooltip direction="top" offset={[0, -20]} opacity={1}>
          You are here (click to clear route)
        </Tooltip>
      </Marker>

      {/* 🛡️ SAFE PLACES */}
      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lon]}
          icon={getIconByType(p.type)}
          eventHandlers={{
            click: () => drawRoute(p.lat, p.lon),
          }}
        >
          <Tooltip direction="top" offset={[0, -20]} opacity={1}>
            <b>{p.name}</b>
            <br />
            {p.type.replace("_", " ").toUpperCase()}
          </Tooltip>
        </Marker>
      ))}

      {/* 🔴 ROUTE */}
      {routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: "green", weight: 3 }}
        />
      )}
    </MapContainer>
  );
};

export default SafePlacesMap;
