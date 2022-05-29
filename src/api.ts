import express from "express";
import { APIConfig } from "./interfaces";
import { shortestRoute } from "./api/shortestRoute";
import { frontendResources } from "./api/frontendResources";
import { battles } from "./api/battles";
import { player } from "./api/player";
import { staticInfo } from "./api/staticInfo";
import expressws from 'express-ws';
import { warmap } from "./api/warmap";

export function startAPI(config: APIConfig) {
    const app = express();
    expressws(app, undefined, { wsOptions: { perMessageDeflate: true, } });

    const endpointComponents = [
        battles,
        staticInfo,
        frontendResources,
        player,
        shortestRoute,
        warmap,
    ];
    
    endpointComponents.forEach(ec => ec(app, config));

    return app;
}
