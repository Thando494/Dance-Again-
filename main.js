window.addEventListener('load', function () {
    init();
});

const handlePositionError = (err) => {
    console.warn(`ERROR(${err.code}): ${err.message}`);
};

const init = () => {
    mapboxgl.accessToken = 'pk.eyJ1IjoibHRkbiIsImEiOiJjbGoybWhydXIwZDRwM2RvMGZjZ2dwaWR2In0.vvl3SlGi0BD1DVcs2qYwqQ';
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v11',
    });

    let startMarker;
    let endMarker;

    const setCurrentPosition = (position) => {
        const marker = new mapboxgl.Marker({
            color: '#a9ffa9',
            draggable: true,
        })
            .setLngLat([position.coords.longitude, position.coords.latitude])
            .addTo(map);

        marker.on('dragend', () => {
            const lngLat = marker.getLngLat();

            if (endMarker) {
                const start = {
                    coords: {
                        longitude: startMarker.getLngLat().lng,
                        latitude: startMarker.getLngLat().lat,
                    },
                };

                const end = {
                    coords: {
                        longitude: endMarker.getLngLat().lng,
                        latitude: endMarker.getLngLat().lat,
                    },
                };

                getThatBeer(start.coords, end.coords);
            }
        });
        if (0) {
            map.flyTo({
                center: marker.getLngLat(),
                zoom: 15,
            });
        }

        map.setCenter([position.coords.longitude, position.coords.latitude]);

        johnWick(marker);
    };

    const getPointsOfInterest = async (map, boundingBox) => {
        const response = await fetch('./data.json');
        const data = await response.json();

        document.title = data.name;

        boundingBox.extend(map.getCenter());

        const beerColors = ['#F5DEB3', '#F4A460', '#8B4513', '#CD853F', '#DAA520', '#FFD700', '#F0E68C', '#EEE8AA', '#BDB76B', '#9ACD32'];

        const timeOuts = [];

        data.pois.forEach((poi, index) => {
            const marker = new mapboxgl.Marker({
                color: beerColors[index],
            })
                .setLngLat([poi.coords.longitude, poi.coords.latitude])
                // .setPopup(new mapboxgl.Popup().setHTML(`<strong>${poi.name}</strong>`))
                .addTo(map);

            marker.getElement().addEventListener('click', (ev) => {
                const start = {
                    coords: {
                        longitude: startMarker.getLngLat().lng,
                        latitude: startMarker.getLngLat().lat,
                    },
                };

                const end = {
                    coords: {
                        longitude: marker.getLngLat().lng,
                        latitude: marker.getLngLat().lat,
                    },
                };
                endMarker = marker;
                getThatBeer(start.coords, end.coords);
            });

            boundingBox.extend(marker.getLngLat());
        });
    };

    const getThatBeer = async (start, end) => {
        const query = await fetch(
            `https://api.mapbox.com/directions/v5/mapbox/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
            { method: 'GET' }
        );
        const json = await query.json();
        const data = json.routes[0];

        const geojson = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'LineString',
                coordinates: data.geometry.coordinates,
            },
        };
        if (map.getSource('route')) {
            map.getSource('route').setData(geojson);
        } else {
            map.addLayer({
                id: 'route',
                type: 'line',
                source: {
                    type: 'geojson',
                    data: geojson,
                },
                layout: {
                    'line-join': 'miter',
                    'line-cap': 'square',
                },
                paint: {
                    'line-color': '#000000',
                    'line-width': 10,
                    'line-opacity': 0.65,
                },
            });
        }

        const instructions = document.getElementById('info');
        const directions = document.createElement('ol');

        data.legs[0].steps.forEach((step) => {
            const li = document.createElement('li');
            li.innerHTML = step.maneuver.instruction;
            directions.appendChild(li);
        });

        instructions.innerHTML = '';
        instructions.appendChild(directions);

        const bounds = new mapboxgl.LngLatBounds(geojson.geometry.coordinates[0], geojson.geometry.coordinates[0]);
        geojson.geometry.coordinates.forEach((coord) => {
            bounds.extend(coord);
        });

        map.fitBounds(bounds, { padding: 50 });
    };

    map.on('load', async () => {
        navigator.geolocation.getCurrentPosition(setCurrentPosition, handlePositionError);
    });

    const johnWick = async (marker) => {
        startMarker = marker;

        const boundingBox = new mapboxgl.LngLatBounds();
        await getPointsOfInterest(map, boundingBox);
        boundingBox.extend(map.getCenter());
        map.fitBounds(boundingBox, { padding: 50 });
    };
};
