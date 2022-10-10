import { Express } from "express";
import { ClassKeys, KeyValueChangeKey, PacketClass } from "hagcp-network-client";
import Long from "long";
import { checkService, notFound } from "../endpoint";
import { APIConfig, battlefieldstatus, supplylinestatus } from "../interfaces";

export function warmap(app: Express, config: APIConfig) {
    const {
        client,
        datastore,
        endpoint,
    } = config;

    endpoint("/mapentitystatus", "no-store", async req => {
        checkService(client);
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                const battlefield = Array.from(datastore.GetItemStore<battlefieldstatus>(KeyValueChangeKey.battlefieldstatus)?.values() || [])
                    .find(value => value.battlefieldid === id);
                const supplyline = battlefield ? null : Array.from(datastore.GetItemStore<supplylinestatus>(KeyValueChangeKey.supplylinestatus)?.values() || [])
                    .find(value => value.supplylineid === id);
                if (battlefield) {
                    return {
                        id: battlefield.id,
                        factionid: battlefield.factionid,
                        mapEntityId: battlefield.battlefieldid,
                        warid: battlefield.warid,
                    };
                } else if (supplyline) {
                    return {
                        id: supplyline.id,
                        factionid: supplyline.factionid,
                        mapEntityId: supplyline.supplylineid,
                        warid: supplyline.warid,
                    };
                }
                notFound();
            }
        }
        throw 412;
    });

    endpoint("/WarCatalogue", "no-store", async req => {
        checkService(client);
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) return await client.sendClassAsync(PacketClass.query_war_catalogue_request, {
                includeWarId: Long.fromString(id),
            });
        }
        throw 412;
    });
}
