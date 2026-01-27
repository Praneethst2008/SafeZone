let lastLocation: { lat: number; lng: number } | null = null;

export const startLocationCache = () => {
  if (!navigator.geolocation) return;

  navigator.geolocation.watchPosition(
    (pos) => {
      lastLocation = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      };
    },
    () => {},
    { enableHighAccuracy: false }
  );
};

export const getCachedLocation = () => lastLocation;
