import mqtt from "mqtt";
import type { GeoPoint, Route, RouteStep } from "./geo.js";
import * as turf from "@turf/turf";
import { GetConfig } from "./config.js";
import { OSRMClient } from "./osrmClient.js";


const log = (...data: any) =>
{
    var currentDate = '[' + new Date().toUTCString() + '] ';
    console.log(currentDate, ...data);
};

const config = GetConfig();

const client = mqtt.connect(config.mqttHost);
const osrmClient = new OSRMClient(config);

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

    const nearest = await osrmClient.getNearestPoint(gps);

    if (nearest === null) {
        log("no nearest point found");
        return;
    }

    const routeLine = turf.lineString(geometry);
    const position = turf.point([nearest.lon, nearest.lat]);
    const snapped = turf.nearestPointOnLine(routeLine, position, { units: "meters" });

    if (snapped.properties.dist > 10) {
        log("recalculate route");
        const newRoute = await osrmClient.calculateRoute([nearest, ...waypoints]);
        if (newRoute === null) {
            log("route is null");
            return;
        }
        client.publish("/navi/active/route", JSON.stringify(newRoute), { retain: true });
        return;
    }
    const step = geometry2step[snapped.properties.index]!+1;
    const linePoints = [snapped.geometry.coordinates];
    for (let i = snapped.properties.index+1;; i++) {
        if (geometry2step[i]! !== step-1) {
            break;
        }
        linePoints.push(geometry[i]!);
    }
    const line = turf.lineString(linePoints);
    const distanceToNextPoint = turf.length(line, { units: "meters" })
    client.publish("/navi/active/distanceToNextPoint", JSON.stringify(distanceToNextPoint), { retain: true });
    client.publish("/navi/active/step", JSON.stringify(step), { retain: true });
};

client.subscribe(["/navi/active/route", "/navi/position/gps", "/navi/active/waypoints"]);
let gps: GeoPoint | null = null;
let route: Route | null = null;
let waypoints: Array<GeoPoint> | null = null;

client.on("message", (topic, payload) => {
    log(topic);
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