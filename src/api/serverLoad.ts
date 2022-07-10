import { Express } from "express";
import armyresourcecategory from "hagcp-assets/json/armyresourcecategory.json";
import { ClassKeys } from "hagcp-network-client";
import { APIConfig, War } from "../interfaces";

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

    app.get("/queuestats", async (_, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        const data = await client.sendPacketAsync<{ requestType: 0; }, any>(ClassKeys.MonitorLoadRequest, { requestType: 0, });
        if (data) {
            const factions = new Map<string, Map<String, any[]>>([
                ["1", new Map],
                ["2", new Map],
                ["3", new Map],
            ]);

            const getSubData = (factionId: string, id: number) =>
                ((factions.get(factionId) || new Map)
                    .get(id.toString()) || [])
                    .reduce((prev: number, curr: { count: number; }) => prev + curr.count, 0);

            data?.waitingTimes.filter((item: { playerTier: number; }) => item.playerTier >= 2)
                .filter((item: { onlyWarMissions: any; }) => item.onlyWarMissions)
                .forEach((item: { factionTemplateId: string; characterTemplateId: String; }) => {
                    const characterMap = factions.get(item.factionTemplateId) || new Map;
                    const queueList = characterMap.get(item.characterTemplateId) || [];
                    queueList.push(item);
                    characterMap.set(item.characterTemplateId, queueList);
                    factions.set(item.factionTemplateId, characterMap);
                });

            const result: any = {};
            ["1", "2", "3"].forEach(factionId => {
                const factionObj = {};
                Reflect.set(factionObj, "rifleman", getSubData(factionId, 1));
                Reflect.set(factionObj, "fighterpilot", getSubData(factionId, 2));
                Reflect.set(factionObj, "paratrooper", getSubData(factionId, 4));
                Reflect.set(factionObj, "tankcrew", getSubData(factionId, 5));
                Reflect.set(factionObj, "recon", getSubData(factionId, 6));
                Reflect.set(result, factionId, factionObj);
            });
            res.json(result);
            return;
        }
        res.sendStatus(412);
    });

    app.get("/stockpiles", async (_, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "public, max-age=60");
        const data = await client.sendPacketAsync<{ requestType: 0; }, { wars: War[]; }>(ClassKeys.MonitorLoadRequest, { requestType: 0, });
        if (data) {
            const idToName = new Map<string, string>();
            const idToCount = new Map<string, Map<string, number>>();
            armyresourcecategory.forEach(item => {
                idToName.set(item.id, item.name);
                idToCount.set(item.id, new Map([
                    ["US", 0],
                    ["GE", 0],
                    ["SU", 0],
                ]));
            });

            data.wars[0].resources.filter(item => !item.hq).forEach(item => {
                const resourceMap = idToCount.get(item.armyResourceCategoryId);
                if (resourceMap) resourceMap.set(item.factionTemplateId, Number.parseInt(item.count));
            });

            const result: any = {};
            for (const [categoryId, categoryName] of idToName) {
                const categoryObj = {};
                const categoryCounts = idToCount.get(categoryId) || new Map;
                Reflect.set(categoryObj, "US", categoryCounts.get("1"));
                Reflect.set(categoryObj, "GE", categoryCounts.get("2"));
                Reflect.set(categoryObj, "SU", categoryCounts.get("3"));
                Reflect.set(result, categoryName, categoryObj);
            }
            res.json(result);
            return;
        }
        res.sendStatus(412);
    });
}
