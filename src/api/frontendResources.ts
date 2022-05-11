import { Express } from "express";
import { KeyValueChangeKey } from "hagcp-network-client";
import { APIConfig } from "../interfaces";

export function frontendResources(app: Express, config: APIConfig) {
    const {
        datastore,
        lookupFactions,
    } = config;
    
    app.get("/supplylinestatus.json", (_, res) => {
        res.set("Cache-control", "public, max-age=10");
        res.json(Array.from(datastore.GetItemStore(KeyValueChangeKey.supplylinestatus)?.values?.() || []));
    });

    app.get("/battlefieldstatus.json", (_, res) => {
        res.set("Cache-control", "public, max-age=10");
        res.json(Array.from(datastore.GetItemStore(KeyValueChangeKey.battlefieldstatus)?.values?.() || []));
    });

    app.get("/deletesupplylinestatus.json", (_, res) => {
        res.set("Cache-control", "public, max-age=10");
        res.json(Array.from(datastore.GetItemStore("deletesupplylinestatus")?.values?.() || []));
    });

    app.get("/factions.json", async (_, res) => {
        res.set("Cache-control", "public, max-age=60");
        res.json(Array.from(lookupFactions.values()));
    });
}
