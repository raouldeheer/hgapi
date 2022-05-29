
import { Express } from "express";
import { KeyValueChangeKey } from "hagcp-network-client";
import { APIConfig, battlefieldstatus, supplylinestatus } from "../interfaces";

export function warmap(app: Express, config: APIConfig) {
    const {
        client,
        datastore,
    } = config;

    app.get("/mapentitystatus", async (req, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.set("Cache-control", "no-store");
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                const battlefield = Array.from(datastore.GetItemStore<battlefieldstatus>(KeyValueChangeKey.battlefieldstatus)?.values() || [])
                    .find(value => value.battlefieldid === id);
                const supplyline = battlefield ? null : Array.from(datastore.GetItemStore<supplylinestatus>(KeyValueChangeKey.supplylinestatus)?.values() || [])
                    .find(value => value.supplylineid === id);
                if (battlefield) {
                    res.json({
                        id: battlefield.id,
                        factionid: battlefield.factionid,
                        mapEntityId: battlefield.battlefieldid,
                        warid: battlefield.warid,
                    });
                } else if (supplyline) {
                    res.json({
                        id: supplyline.id,
                        factionid: supplyline.factionid,
                        mapEntityId: supplyline.supplylineid,
                        warid: supplyline.warid,
                    });
                } else {
                    res.sendStatus(404);
                }
                return;
            }
        }
        res.sendStatus(412);
    });
}
