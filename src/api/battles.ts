import { Express } from "express";
import { ClassKeys, KeyValueChangeKey } from "hagcp-network-client";
import Long from "long";
import { CachedRequests } from "../cache/cachedRequests";
import { APIConfig, Battle } from "../interfaces";
import { getResolveTitle } from "./battlefieldNaming";

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
