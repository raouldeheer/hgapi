import express from "express";
import { ClassKeys, Client, KeyValueChangeKey } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import Long from "long";
import { Accesspoint, AccesspointTemplate, Battle, Battlefield, Faction, MapPoint, Supplyline } from "./interfaces";

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

export async function startAPI(
    datastore: DataStore,
    lookupFactions: Map<string, any>,
    expressDatastore: DataStore,
    lookupTemplateFaction: Map<string, any>,
    client?: Client,
) {
    const GetMissionDetailsCache = new CachedRequests(15, (input: string) =>
        client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, {
            missionId: 0,
            battleId: Long.fromString(input),
        }));

    const resolveTitle = (bftitle: string): MapPoint => {
        if (bftitle.includes(" - ")) {
            const battlefield = Array.from(expressDatastore.GetItemStore<Battlefield>(KeyValueChangeKey.battlefield)?.values() || [])
                .find(value => value.bftitle === bftitle.split(" - ")[0]);
            if (!battlefield) throw 404;

            const accesspoint = Array.from(expressDatastore.GetItemStore<Accesspoint>(KeyValueChangeKey.accesspoint)?.values() || [])
                .find(value => {
                    if (value.battlefield === battlefield.id) {
                        const template = expressDatastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, value.template);
                        return bftitle === `${battlefield.bftitle} - ${template.abbr}`;
                    }
                    return false;
                });
            if (!accesspoint) throw 404;

            const supplyline = Array.from(expressDatastore.GetItemStore<Supplyline>(KeyValueChangeKey.supplyline)?.values() || [])
                .find(value => (value.accesspoint1Id === accesspoint.id) || (value.accesspoint2Id === accesspoint.id));
            if (!supplyline) throw 404;
            return supplyline;
        } else {
            const battlefield = Array.from(expressDatastore.GetItemStore<Battlefield>(KeyValueChangeKey.battlefield)?.values() || [])
                .find(value => value.bftitle === bftitle);
            if (!battlefield) throw 404;
            return battlefield;
        }
    };

    const toBFTitle = (id: string) => {
        const result = expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id)?.bftitle;
        if (result) return result;
        const supplyline = expressDatastore.GetData<Supplyline>(KeyValueChangeKey.supplyline, id);
        if (!supplyline) throw 404;
        const ap1 = expressDatastore.GetData<Accesspoint>(KeyValueChangeKey.accesspoint, supplyline.accesspoint1Id);
        if (!ap1) throw 404;
        const ap2 = expressDatastore.GetData<Accesspoint>(KeyValueChangeKey.accesspoint, supplyline.accesspoint2Id);
        if (!ap2) throw 404;
        const apt1 = expressDatastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, ap1.template);
        if (!apt1) throw 404;
        const apt2 = expressDatastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, ap2.template);
        if (!apt2) throw 404;
        const apb1 = expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, ap1.battlefield);
        if (!apb1) throw 404;
        const apb2 = expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, ap2.battlefield);
        if (!apb2) throw 404;
        return `${apb1.bftitle} - ${apt1.abbr} or ${apb2.bftitle} - ${apt2.abbr}`;
    };

    const app = express();
    app.get("/battles", async (req, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "public, max-age=60");
        if (req.query.factionTemplateId) {
            const factionTemplateId = String(req.query.factionTemplateId);
            if (/^\d+$/.test(factionTemplateId)) {
                res.json(await Promise.all(
                    Array.from<Battle>(datastore.GetItemStore(KeyValueChangeKey.battle)?.values() || [])
                        .filter(e => e.excludedFactionId !== lookupTemplateFaction.get(factionTemplateId).factionId)
                        .map(async value => ({
                            ...value,
                            MissionDetails: await client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, { missionId: 0, battleId: Long.fromString(value.id) }),
                        }))
                ));
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/missiondetails", async (req, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "no-store");
        if (req.query.bftitle) {
            try {
                const mapPoint = resolveTitle(String(req.query.bftitle));

                const battle = Array.from(datastore.GetItemStore<Battle>(KeyValueChangeKey.battle)?.values() || [])
                    .find(value => value.mapEntityId === mapPoint.id);
                if (!battle) throw 404;

                res.json(await client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, {
                    missionId: 0,
                    battleId: Long.fromString(battle.id),
                }));
            } catch (error) {
                if (typeof error == "number") res.sendStatus(error);
            }
            return;
        } else if (req.query.battleId) {
            const battleId = String(req.query.battleId);
            if (/^\d+$/.test(battleId)) {
                res.json(await client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, {
                    missionId: 0,
                    battleId: Long.fromString(battleId),
                }));
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/hostingcenter", async (req, res) => {
        res.set("Cache-control", "public, max-age=60");
        if (req.query.hostingCenterId) {
            const hostingCenterId = String(req.query.hostingCenterId);
            if (/^\d+$/.test(hostingCenterId)) {
                res.json(datastore.GetData(KeyValueChangeKey.HostingCenterInfo, hostingCenterId));
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/battlefield", async (req, res) => {
        res.set("Cache-control", "public, max-age=60");
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                let result = expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id);
                if (!result) {
                    res.sendStatus(404);
                    return;
                }
                res.json(result);
                return;
            }
        } else if (req.query.bftitle) {
            try {
                const mapPoint = resolveTitle(String(req.query.bftitle));
                res.json(mapPoint);
            } catch (error) {
                if (typeof error == "number") res.sendStatus(error);
            }
            return;
        }
        res.sendStatus(412);
    });

    app.get("/supplyline", async (req, res) => {
        res.set("Cache-control", "public, max-age=60");
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                let result = expressDatastore.GetData<Supplyline>(KeyValueChangeKey.supplyline, id);
                if (!result) {
                    res.sendStatus(404);
                    return;
                }
                res.json(result);
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/faction", async (req, res) => {
        res.set("Cache-control", "public, max-age=60");
        if (req.query.factionId) {
            const factionId = String(req.query.factionId);
            if (/^\d+$/.test(factionId)) {
                const faction: Faction = lookupFactions.get(factionId);
                if (!faction) {
                    res.sendStatus(404);
                    return;
                }
                res.json(faction);
                return;
            }
        } else if (req.query.factionTemplateId) {
            const factionTemplateId = String(req.query.factionTemplateId);
            if (/^\d+$/.test(factionTemplateId)) {
                const faction: Faction = lookupTemplateFaction.get(factionTemplateId);
                if (!faction) {
                    res.sendStatus(404);
                    return;
                }
                res.json(faction);
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/bftitle", async (req, res) => {
        res.set("Cache-control", "public, max-age=60");
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                try {
                    const mapPoint = toBFTitle(id);
                    res.json(mapPoint);
                } catch (error) {
                    if (typeof error == "number") res.sendStatus(error);
                }
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/playerdetail", async (req, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "public, max-age=60");
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                const gamertag = (await client!.sendPacketAsync<{ gamertag: string; }>(ClassKeys.QueryGamertagRequest, {
                    playerId: Long.fromString(id)
                })).gamertag;
                if (gamertag) {
                    res.json(await client!.sendPacketAsync(ClassKeys.SearchPlayerDetailRequest, {
                        playerGamerTag: gamertag
                    }));
                    return;
                }
                res.sendStatus(404);
                return;
            }
        } else if (req.query.gamertag) {
            const gamertag = String(req.query.gamertag);
            if (/[@*\\%\s]/.test(gamertag) || gamertag.length < 4 || gamertag.length > 26 || gamertag.includes("reto.")) {
                res.sendStatus(418); //! This should never happen!
                return;
            }
            res.json(await client!.sendPacketAsync(ClassKeys.SearchPlayerDetailRequest, {
                playerGamerTag: gamertag
            }));
            return;
        }
        res.sendStatus(412);
    });

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

    return app;
}
