import type { Config } from "./config.js";
import type { GeoPoint, Route } from "./geo.js";

type RouteResponse = {
    routes: Array<Route>;
};

export class OSRMClient {
    private config: Config;

    constructor(config: Config) {
        this.config = config;
    }

    async getNearestPoint(from: GeoPoint): Promise<GeoPoint | null> {
        const url = `${this.config.osrmHost}/nearest/v1/driving/${from.lon},${from.lat}`
        try {
            const response = await fetch(url);
            const data = await response.json();

            if (data.waypoints.length === 0) {
                return null;
            }

            return {
                lon: data.waypoints[0]!.location[0],
                lat: data.waypoints[0]!.location[1],
            }
        } catch {
            return null;
        }
    }

    async calculateRoute(waypoints: Array<GeoPoint>): Promise<Route | null> {
        const q = waypoints.map((waypoint) => `${waypoint.lon},${waypoint.lat}`).join(";")
        const url = `${this.config.osrmHost}/route/v1/driving/${q}?overview=full&geometries=geojson&steps=true`;
        try {
            const response = await fetch(url);
            const data = await response.json() as RouteResponse;

            return data.routes[0] || null;
        } catch {
            return null;
        }
    }
}