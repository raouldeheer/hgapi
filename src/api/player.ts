import { Express } from "express";
import { ClassKeys, KeyValueChangeKey, ResponseType } from "hagcp-network-client";
import Long from "long";
import { stringify } from "uuid";
import { APIConfig, Battle, SearchPlayerDetailResponse } from "../interfaces";

export function player(app: Express, config: APIConfig) {
    const {
        client,
        datastore,
        GetMissionDetailsCache,
        lookupTemplateFaction,
    } = config;

    const idToGamertag = async (id: string) => (await client!.sendPacketAsync<{ playerId: Long; }, { gamertag: string; }>(ClassKeys.QueryGamertagRequest, {
        playerId: Long.fromString(id)
    })).gamertag;

    app.get("/playerdetail", async (req, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "public, max-age=60");
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\-\d+$/.test(id)) {
                const gamertag = await idToGamertag(id);
                if (gamertag) {
                    const result = await client!.sendPacketAsync<{ playerGamerTag: string; }, SearchPlayerDetailResponse>(ClassKeys.SearchPlayerDetailRequest, {
                        playerGamerTag: gamertag
                    });
                    if (result.response === ResponseType.player_not_found) {
                        res.sendStatus(404);
                        return;
                    }
                    res.json(result);
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
            const result = await client!.sendPacketAsync<{ playerGamerTag: string; }, SearchPlayerDetailResponse>(ClassKeys.SearchPlayerDetailRequest, {
                playerGamerTag: gamertag
            });
            if (result.response === ResponseType.player_not_found) {
                res.sendStatus(404);
                return;
            }
            res.json(result);
            return;
        }
        res.sendStatus(412);
    });

    app.get("/attop", async (req, res) => {
        const battles = await Promise.all(
            Array.from<Battle>(datastore.GetItemStore(KeyValueChangeKey.battle)?.values() || [])
                .map(async value => ({
                    ...value,
                    MissionDetails: await GetMissionDetailsCache.request(value.id),
                }))
        );
        const playerList = new Map<string, number>();
        const factionList = new Map<string, Set<string>>();

        const addPlayer = (factionId: string, playerId: string) => {
            const players = factionList.get(factionId) || new Set;
            players.add(playerId);
            factionList.set(factionId, players);
        };

        battles.forEach(battle => {
            battle?.MissionDetails?.assaultTeams?.forEach?.(team => {
                if (team.ownerPlayerId === "0") return;
                playerList.set(team.ownerPlayerId, (playerList.get(team.ownerPlayerId) || 0) + 1);
                addPlayer(team.factionId, team.ownerPlayerId);
            });
        });
        type playerPlaces = { playerId: string, playerName: string, amount: number; }[];

        const getTop10 = async (): Promise<playerPlaces> => {
            let top10: [string, number][] = [];
            let top10Min = 0;
            for (const player of playerList) {
                if (player[1] >= top10Min) {
                    top10.push(player);
                    top10 = top10.sort((a, b) => b[1] - a[1]);
                    if (top10.length >= 10) top10.pop();
                    top10Min = top10[top10.length - 1][1];
                }
            }
            return await Promise.all(top10.map(async v => ({ playerId: v[0], playerName: await idToGamertag(v[0]), amount: v[1] })));
        };
        const getTop10Faction = async (faction: string): Promise<playerPlaces> => {
            let top10: [string, number][] = [];
            let top10Min = 0;
            const list = factionList.get(faction) || new Set;
            const factionPlayerList = Array.from(playerList.entries()).filter(player => list.has(player[0]));
            for (const player of factionPlayerList) {
                if (player[1] >= top10Min || top10.length < 10) {
                    top10.push(player);
                    top10 = top10.sort((a, b) => b[1] - a[1]);
                    if (top10.length >= 10) top10.pop();
                    top10Min = top10[top10.length - 1][1];
                }
            }
            return await Promise.all(top10.map(async v => ({ playerId: v[0], playerName: await idToGamertag(v[0]), amount: v[1] })));
        };

        const result: {
            all: playerPlaces;
            US: playerPlaces;
            GE: playerPlaces;
            SU: playerPlaces;
        } = {
            all: await getTop10(),
            US: await getTop10Faction(lookupTemplateFaction.get("1").factionId),
            GE: await getTop10Faction(lookupTemplateFaction.get("2").factionId),
            SU: await getTop10Faction(lookupTemplateFaction.get("3").factionId),
        };

        res.json(result);
    });
}
