import express from "express";
import { APIConfig } from "./interfaces";
import { shortestRoute } from "./api/shortestRoute";
import { frontendResources } from "./api/frontendResources";
import { battles } from "./api/battles";
import { player } from "./api/player";
import { staticInfo } from "./api/staticInfo";

export async function startAPI(config: APIConfig) {
    const app = express();

    [
        battles,
        staticInfo,
        frontendResources,
        player,
        shortestRoute,
    ].forEach(ec => ec(app, config));

    return app;
}
