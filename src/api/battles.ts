import { Express } from "express";
import { ClassKeys, KeyValueChangeKey } from "hagcp-network-client";
import Long from "long";
import { CachedRequests } from "../cache/cachedRequests";
import { APIConfig, Battle, Faction } from "../interfaces";
import ws from "ws";
import { createHash } from "crypto";
import { v4 } from "uuid";

const shortToId = new Map<string, string>([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
]);

export function battles(app: Express, config: APIConfig) {
    const {
        datastore,
        lookupFactions,
        lookupTemplateFaction,
        client,
        resolveTitle,
    } = config;

    const GetMissionDetailsCache = new CachedRequests(15, (input: string) =>
        client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, {
            missionId: 0,
            battleId: Long.fromString(input),
        }));

    app.get("/faction", async (req, res) => {
        res.set("Cache-control", "public, max-age=86400");
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

    app.get("/factionbattles/:id.json", async (req, res) => {
        if (!client) {
            res.set("Cache-control", "public, max-age=60");
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

    config.websockets.set("/socket/factionbattles", new Set);
    // @ts-expect-error
    app.ws("/socket/factionbattles", (ws: ws, req: express.Request) => {
        let interval: NodeJS.Timer | undefined;
        const startTime = Date.now();
        const uuid = v4();
        config.websockets.get("/socket/factionbattles")?.add(uuid);
        ws.once("message", async (msg: string) => {
            if (msg && typeof msg === "string") {
                console.log(`/socket/factionbattles/ ${msg} <> ${uuid}`);
                const id = shortToId.get(msg);
                if (id) {
                    let battles: Map<string, BattleResult> = new Map;
                    const loop = async () => {
                        const deletedBattles: string[] = [];
                        const changedBattles: BattleResult[] = [];
                        const currentBattles = Array.from<Battle>(datastore.GetItemStore(KeyValueChangeKey.battle)?.values() || [])
                            .filter(e => e.excludedFactionId !== lookupTemplateFaction.get(id).factionId);
                        const activeBattles = currentBattles.map(value => value.id);

                        const newBattles: BattleResult[] = await Promise.all(
                            currentBattles.map(async value => ({
                                ...value,
                                MissionDetails: await GetMissionDetailsCache.request(value.id),
                            }))
                        );

                        // Make new set of battles
                        const newBattlesMap = new Map(newBattles.map(v => ([v.id, v])));

                        // Delete battles that don't exist anymore
                        for (const iterator of battles.keys())
                            if (!newBattlesMap.has(iterator))
                                deletedBattles.push(iterator);

                        const hash = (data: BattleResult) =>
                            createHash("md5").update(JSON.stringify(data)).digest("base64");
                        newBattles.forEach(element => {
                            const oldInfo = battles.get(element.id);
                            if (!oldInfo || hash(oldInfo) !== hash(element))
                                changedBattles.push(element);
                        });

                        // Set battles to new battles
                        battles = newBattlesMap;

                        // Send update
                        if (deletedBattles.length >= 1 || changedBattles.length >= 1) {
                            ws.send(JSON.stringify({
                                deletedBattles,
                                changedBattles,
                                activeBattles,
                            }));
                        }
                    };

                    let inLoop: boolean = false;
                    interval = setInterval(() => {
                        if (!inLoop) {
                            inLoop = true;
                            loop().then(() => { inLoop = false; });
                        }
                    }, 5000);
                }
            }
        });
        ws.on("close", () => {
            config.websockets.get("/socket/factionbattles")?.delete(uuid);
            console.log(`WebSocket was closed after ${Math.floor((startTime - Date.now()) / 1000)} seconds <> ${uuid}`);
            if (interval) clearInterval(interval);
        });
    });

}

interface BattleResult {
    MissionDetails: any;
    id: string;
    warid: string;
    mapEntityId: string;
    mapEntityTypeId: string;
    start: string;
    factioncount: number;
    excludedFactionId: string;
    position: number;
    activationTimeStamp: string;
}
