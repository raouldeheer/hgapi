import { Express } from "express";
import { KeyValueChangeKey, Packets } from "hagcp-network-client";
import { notFound } from "../endpoint";
import { APIConfig, Battlefield, Supplyline } from "../interfaces";

export function staticInfo(app: Express, config: APIConfig) {
    const {
        datastore,
        expressDatastore,
        resolveTitle,
        toBFTitle,
        endpoint,
    } = config;

    endpoint("/hostingcenter", `public, max-age=${config.staticMaxAge}`, async req => {
        if (req.query.hostingCenterId) {
            const hostingCenterId = String(req.query.hostingCenterId);
            if (/^\d+$/.test(hostingCenterId)) return datastore.GetData(KeyValueChangeKey.HostingCenterInfo, hostingCenterId) || notFound();
        }
        throw 412;
    });

    endpoint("/hostingcenters", "no-store", async () => {
        const hostingcenters = datastore.GetItemStore<Packets.HostingCenterInfo>(KeyValueChangeKey.HostingCenterInfo) || notFound();
        const result: Record<string, Packets.HostingCenterInfo> = {};
        for (const [key, value] of hostingcenters) Reflect.set(result, key, value);
        return result;
    });

    endpoint("/battlefield", `public, max-age=${config.staticMaxAge}`, async req => {
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) return expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id) || notFound();
        } else if (req.query.bftitle) {
            return resolveTitle(String(req.query.bftitle));
        }
        throw 412;
    });

    endpoint("/battlefield/:id.json", `public, max-age=2592000`, async req => {
        if (req.params.id) {
            const id = String(req.params.id);
            if (/^\d+$/.test(id)) return expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id) || notFound();
        }
        throw 412;
    });

    endpoint("/supplyline", `public, max-age=${config.staticMaxAge}`, async req => {
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id))
                return expressDatastore.GetData<Supplyline>(KeyValueChangeKey.supplyline, id) || notFound();
        }
        throw 412;
    });

    endpoint("/bftitle", `public, max-age=${config.staticMaxAge}`, async req => {
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) return toBFTitle(id);
        }
        throw 412;
    });
}
