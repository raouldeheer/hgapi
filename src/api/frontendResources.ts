import { Express } from "express";
import { ClassKeys, KeyValueChangeKey } from "hagcp-network-client";
import { IKeyValueChangeSetResult } from "hagcp-utils";
import { APIConfig } from "../interfaces";
import { v4 } from "uuid";

export function frontendResources(app: Express, config: APIConfig) {
    const {
        datastore,
        lookupFactions,
        client,
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

    config.websockets.set("/socket/mapstatus", new Set);
    // @ts-expect-error
    app.ws("/socket/mapstatus", (ws: ws, req: Request) => {
        const uuid = v4();
        console.log(`/socket/mapstatus/ <> ${uuid}`);
        const startTime = Date.now();
        config.websockets.get("/socket/mapstatus")?.add(uuid);
        const watcher = (data: IKeyValueChangeSetResult) => {
            const result = {
                set: data.set?.filter(value =>
                    value.key === KeyValueChangeKey.war ||
                    value.key === KeyValueChangeKey.battlefieldstatus ||
                    value.key === KeyValueChangeKey.supplylinestatus),
                delete: data.delete?.filter(value =>
                    value.key === KeyValueChangeKey.battlefieldstatus ||
                    value.key === KeyValueChangeKey.supplylinestatus),
            };
            if ((result.set && result.set?.length >= 1) ||
                (result.delete && result.delete?.length >= 1))
                ws.send(JSON.stringify(result));
        };
        ws.once("message", (msg: string) => {
            const data: IKeyValueChangeSetResult = {
                set: [
                    ...datastore.ItemstoreToKeyValueSet(KeyValueChangeKey.battlefieldstatus).set || [],
                    ...datastore.ItemstoreToKeyValueSet(KeyValueChangeKey.supplylinestatus).set || [],
                    ...datastore.ItemstoreToKeyValueSet(KeyValueChangeKey.war).set || [],
                ]
            };
            ws.send(JSON.stringify(data));
            client?.on(ClassKeys.KeyValueChangeSet, watcher);
        });
        ws.on("close", () => {
            config.websockets.get("/socket/mapstatus")?.delete(uuid);
            console.log(`WebSocket was closed after ${Math.floor((startTime - Date.now()) / 1000)} seconds <> ${uuid}`);
            client?.removeListener(ClassKeys.KeyValueChangeSet, watcher);
        });
    });
}
