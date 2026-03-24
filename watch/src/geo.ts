export type GeocoderPlace = GeoPoint & {
    display_name: string;
    name: string;
};

export type GeoPoint = {
    lat: number,
    lon: number,
}

export type GeoJSON = {
    coordinates: [[number, number]];
    type: "LineString";
}

export type Route = {
    duration: number;
    distance: number;
    geometry: GeoJSON,
    legs: Array<{
        steps: Array<RouteStep>,
        summary: string,
        duration: number,
        distance: number,
    }>
};

export type RouteStep = {
    maneuver: {
        modifier: string,
        location: [
            number,
            number,
        ],
        bearing_before: number,
    },
    geometry: {
        coordinates: Array<[number, number]>,
    },
    distance: number;
    name: string,
}