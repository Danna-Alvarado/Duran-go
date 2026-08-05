export const obtenerUbicacion = () => {
  return new Promise((resolve, reject) => {

    if (!navigator.geolocation) {
      reject(new Error("La geolocalización no está disponible"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {

        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });

      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );

  });
};