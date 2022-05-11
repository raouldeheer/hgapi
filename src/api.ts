import express from "express";
import { APIConfig } from "./interfaces";
import { shortestRoute } from "./api/shortestRoute";
import { frontendResources } from "./api/frontendResources";
import { battles } from "./api/battles";
import { player } from "./api/player";
import { staticInfo } from "./api/staticInfo";

export async function startAPI(config: APIConfig) {
    const {
        expressDatastore,
    } = config;

    const app = express();

    battles(app, config);
    staticInfo(app, config);
    frontendResources(app, config);
    player(app, config);
    shortestRoute(app, config);
    

    return app;
}
