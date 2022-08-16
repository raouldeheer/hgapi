import { Express } from "express";
import armyresourcecategory from "hagcp-assets/json/armyresourcecategory.json";
import { ClassKeys } from "hagcp-network-client";
import { CachedFunction } from "../cache/cachedRequests";
import { checkService } from "../endpoint";
import { APIConfig, War } from "../interfaces";

const serverloadCacheTime = 10;
export function serverLoad(app: Express, config: APIConfig) {
    const {
        client,
        endpoint,
    } = config;

    const cachedServerload = CachedFunction(serverloadCacheTime, () => {
        checkService(client);
        return client.sendPacketAsync<{ requestType: 0; }, { wars: War[]; waitingTimes: any[]; }>(ClassKeys.MonitorLoadRequest, { requestType: 0, });
    });

    endpoint("/serverload", `public, max-age=${serverloadCacheTime}`, async _ => {
        const data = await cachedServerload();
        if (data) return data;
        throw 412;
    });

    endpoint("/queuestats", `public, max-age=${serverloadCacheTime}`, async _ => {
        const data = await cachedServerload();
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
            return result;
        }
        throw 412;
    });

    endpoint("/stockpiles", `public, max-age=${serverloadCacheTime}`, async _ => {
        const data = await cachedServerload();
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

            data.wars[0].resources.filter(item => item.hq).forEach(item => {
                const resourceMap = idToCount.get(item.armyResourceCategoryId);
                if (resourceMap) resourceMap.set(item.factionTemplateId, Number.parseInt(item.count));
            });

            const result: any = {};
            for (const [categoryId, categoryName] of idToName) {
                const categoryObj = {};
                const categoryCounts = idToCount.get(categoryId) || new Map;
                Reflect.set(categoryObj, "US", categoryCounts.get("1") || 0);
                Reflect.set(categoryObj, "GE", categoryCounts.get("2") || 0);
                Reflect.set(categoryObj, "SU", categoryCounts.get("3") || 0);
                Reflect.set(result, categoryName, categoryObj);
            }
            return result;
        }
        throw 412;
    });
}
