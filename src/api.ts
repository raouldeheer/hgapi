import express from "express";
import { ClassKeys, Client, KeyValueChangeKey } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import Long from "long";
import { Battle, Battlefield, Faction, Supplyline } from "./interfaces";
import { shortestRoute } from "./api/shortestRoute";
import { getResolveTitle, getToBFTitle } from "./api/battlefieldNaming";
import { frontendResources } from "./api/frontendResources";

export async function startAPI(
    datastore: DataStore,
    lookupFactions: Map<string, any>,
    expressDatastore: DataStore,
    lookupTemplateFaction: Map<string, any>,
    client?: Client,
) {
    const resolveTitle = getResolveTitle(expressDatastore);
    const toBFTitle = getToBFTitle(expressDatastore);

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

    frontendResources(app, datastore, lookupFactions, lookupTemplateFaction, client);

    app.get("/battlefieldroute", shortestRoute(expressDatastore));

    return app;
}
