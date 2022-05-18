import { Express } from "express";
import { ClassKeys, KeyValueChangeKey } from "hagcp-network-client";
import Long from "long";
import { CachedRequests } from "../cache/cachedRequests";
import { APIConfig, Battle } from "../interfaces";
import ws from "ws";
import { createHash } from "crypto";

const shortToId = new Map<string, string>([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
]);

export function battles(app: Express, config: APIConfig) {
    const {
        datastore,
        lookupTemplateFaction,
        client,
        resolveTitle,
    } = config;

    const GetMissionDetailsCache = new CachedRequests(15, (input: string) =>
        client!.sendPacketAsync(ClassKeys.GetMissionDetailsRequest, {
            missionId: 0,
            battleId: Long.fromString(input),
        }));

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

    // @ts-expect-error
    app.ws("/socket/factionbattles", (ws: ws, req: express.Request) => {
        let interval: NodeJS.Timer | undefined;
        ws.once("message", async (msg: string) => {
            if (msg && typeof msg === "string") {
                console.log("/socket/factionbattles/" + msg);
                const id = shortToId.get(msg);
                if (id) {
                    let battles: Map<string, BattleResult> = new Map;
                    const loop = async () => {
                        const deletedBattles: string[] = [];
                        const changedBattles: BattleResult[] = [];

                        const newBattles: BattleResult[] = await Promise.all(
                            Array.from<Battle>(datastore.GetItemStore(KeyValueChangeKey.battle)?.values() || [])
                                .filter(e => e.excludedFactionId !== lookupTemplateFaction.get(id).factionId)
                                .map(async value => ({
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
            console.log("WebSocket was closed");
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
