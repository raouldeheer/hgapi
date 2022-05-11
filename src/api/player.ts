
import { Express } from "express";
import { ClassKeys } from "hagcp-network-client";
import Long from "long";
import { APIConfig } from "../interfaces";

export function player(app: Express, config: APIConfig) {
    const client = config.client;

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
}
