import { Express } from "express";
import { ClassKeys, Client, KeyValueChangeKey } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import Long from "long";
import { Battle } from "../interfaces";

const shortToId = new Map<string, string>([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
]);

class CachedRequests<T, Y> {
    private readonly cachedResults: Map<T, Y>;
    constructor(
        private readonly threshold: number,
        private readonly action: (input: T) => Promise<Y>
    ) {
        this.cachedResults = new Map;
    }
    public async request(input: T): Promise<Y> {
        if (this.cachedResults.has(input)) {
            const result = this.cachedResults.get(input);
            if (result) return result;
        }
        const outputResult = await this.action(input);
        this.cachedResults.set(input, outputResult);
        setTimeout(() => {
            this.cachedResults.delete(input);
        }, this.threshold * 1000);
        return outputResult;
    }
}

export function frontendResources(app: Express, datastore: DataStore, lookupFactions: Map<string, any>, lookupTemplateFaction: Map<string, any>, client?: Client) {
    const GetMissionDetailsCache = new CachedRequests(15, (input: string) =>
        client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, {
            missionId: 0,
            battleId: Long.fromString(input),
        }));
    
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

    app.get("/factionbattles/:id.json", async (req, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "public, max-age=5");
        if (req.params.id) {
            const id = shortToId.get(String(req.params.id));
            if (id) {
                res.json(await Promise.all(
                    Array.from<Battle>(datastore.GetItemStore(KeyValueChangeKey.battle)?.values() || [])
                        .filter(e => e.excludedFactionId !== lookupTemplateFaction.get(id).factionId)
                        .map(async value => ({
                            ...value,
                            MissionDetails: await GetMissionDetailsCache.request(value.id),
                        }))
                ));
                return;
            }
        }
        res.sendStatus(412);
    });
}
