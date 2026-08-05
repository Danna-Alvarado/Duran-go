export const buscarLugares = async (texto) => {

    if (texto.trim().length < 3) {
        return [];
    }

    try {

        const response = await fetch(
             `https://photon.komoot.io/api/?q=${encodeURIComponent(texto)}&limit=20&bbox=-104.80,23.95,-104.55,24.15`
        );

        const data = await response.json();

        console.log("Total:", data.features.length);
        console.log("Primer resultado:", data.features[0]?.properties);

        return data.features

            // Solo resultados relacionados con Durango
            .filter((lugar) => {
                const props = lugar.properties;

                const textoProps = JSON.stringify(props).toLowerCase();

                return textoProps.includes("durango");
            })

            .map((lugar) => ({

                nombre:
                    lugar.properties.name ||
                    lugar.properties.street ||
                    "Sin nombre",

                direccion:
                    [
                        lugar.properties.street,
                        lugar.properties.city,
                        lugar.properties.district,
                        lugar.properties.county,
                        lugar.properties.state
                    ]
                    .filter(Boolean)
                    .join(", "),

                lat: lugar.geometry.coordinates[1],
                lng: lugar.geometry.coordinates[0]

            }));

    } catch (error) {

        console.error("Error buscando lugares:", error);

        return [];
    }

};