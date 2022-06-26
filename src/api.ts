import express from "express";
import { APIConfig } from "./interfaces";
import { shortestRoute } from "./api/shortestRoute";
import { frontendResources } from "./api/frontendResources";
import { battles } from "./api/battles";
import { player } from "./api/player";
import { serverLoad } from "./api/serverLoad";
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
        serverLoad,
        shortestRoute,
        warmap,
    ];

    endpointComponents.forEach(ec => ec(app, config));

    setInterval(() => {
        let total = "Websockets:";
        for (const iterator of config.websockets) {
            total += `\n${iterator[0]} (${iterator[1].size}): ${Array.from(iterator[1].values()).join(",")}`;
        }
        console.log(total);
    }, 30000);

    return app;
}
