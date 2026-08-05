export const obtenerUbicacion = () => {
  return new Promise((resolve, reject) => {

    if (!navigator.geolocation) {
      reject(new Error("La geolocalización no está disponible"));
      return;
    }

    navigator.geolocation.getCurrentPosition(

      async (position) => {

        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {

          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
          );

          const data = await response.json();

          resolve({
            lat,
            lng,
            direccion: data.display_name || "Ubicación actual"
          });

        } catch (error) {

          resolve({
            lat,
            lng,
            direccion: "Ubicación actual"
          });

        }

      },

      (error) => {
        reject(error);
      },

      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 60000
      }

    );

  });
};