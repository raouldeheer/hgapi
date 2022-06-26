import { Express } from "express";
import { ClassKeys } from "hagcp-network-client";
import { APIConfig } from "../interfaces";

export function serverLoad(app: Express, config: APIConfig) {
    const client = config.client;

    app.get("/serverload", async (_, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "public, max-age=60");
        const data = await client.sendPacketAsync<{ requestType: 0; }, any>(ClassKeys.MonitorLoadRequest, { requestType: 0, });
        if (data) {
            res.json(data);
            return;
        }
        res.sendStatus(412);
    });
}
