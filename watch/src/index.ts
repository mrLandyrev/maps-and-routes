import mqtt from "mqtt";
import type { GeoPoint, Route, RouteStep } from "./geo.js";
import * as turf from "@turf/turf";

const log = (...data: any) =>
{
    var currentDate = '[' + new Date().toUTCString() + '] ';
    console.log(currentDate, ...data);
};


const client = mqtt.connect("ws://host.docker.internal:1884");

type RouteResponse = {
    routes: Array<Route>;
};

const calculateRoute = async (waypoints: Array<GeoPoint>): Promise<Route | null> => {
    const q = waypoints.map((waypoint) => `${waypoint.lon},${waypoint.lat}`).join(";")
    const url = `http://osrm:5000/route/v1/driving/${q}?overview=full&geometries=geojson&steps=true`;

    const response = await fetch(url);
    const data = await response.json() as RouteResponse;

    return data.routes[0] || null;
};

const calculateStep = async (route: Route | null, gps: GeoPoint | null, waypoints: Array<GeoPoint> | null) => {
    log("start calculate route");
    if (!gps) {
        log("no gps data");
        return;
    }
    if (!route) {
        log("no route data");
        return;
    }
    if (!waypoints) {
        log("no waypoints data");
        return;
    }
    log("all data provided");

    let geometry: Array<RouteStep["geometry"]["coordinates"][0]> = [];
    let geometry2step: Array<number> = [];
    let stepIndex = 0;

    route.legs.forEach((leg) => {
        leg.steps.forEach((step) => {
            geometry2step.push(...new Array<number>(step.geometry.coordinates.length).fill(stepIndex));
            geometry.push(...step.geometry.coordinates);
            stepIndex++;
        });
    });

    const routeLine = turf.lineString(geometry);
    const position = turf.point([gps.lon, gps.lat]);
    const snapped = turf.nearestPointOnLine(routeLine, position);

    log(JSON.stringify(snapped.properties));

    if (snapped.properties.dist > 0.05) {
        log("recalculate route");
        const newRoute = await calculateRoute([gps, ...waypoints]);
        if (newRoute === null) {
            log("route is null");
            return;
        }
        client.publish("/navi/active/route", JSON.stringify(newRoute), { retain: true });
        return;
    }
    const step = geometry2step[snapped.properties.index]!+1;
    log("set step");
    client.publish("/navi/active/step", JSON.stringify(step), { retain: true });
};

client.subscribe(["/navi/active/route", "/navi/position/gps", "/navi/active/waypoints"]);
let gps: GeoPoint | null = null;
let route: Route | null = null;
let waypoints: Array<GeoPoint> | null = null;

function debounce<T extends Function>(cb: T, wait = 1000) {
    let h: NodeJS.Timeout;
    let callable = (...args: any) => {
        clearTimeout(h);
        h = setTimeout(() => cb(...args), wait);
    };
    return <T>(<any>callable);
}

const f = debounce(calculateStep);

client.on("message", (topic, payload) => {
    console.log(topic);
    switch (topic) {
        case "/navi/active/route":
            route = JSON.parse(payload.toString());
            break;
        case "/navi/position/gps":
            gps = JSON.parse(payload.toString());
            break;
        case "/navi/active/waypoints":
            waypoints = JSON.parse(payload.toString());
            break;
    }
    calculateStep(route, gps, waypoints);
});