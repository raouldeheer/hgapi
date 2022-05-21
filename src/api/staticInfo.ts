
import { Express } from "express";
import { KeyValueChangeKey } from "hagcp-network-client";
import { APIConfig, Battlefield, Supplyline } from "../interfaces";

export function staticInfo(app: Express, config: APIConfig) {
    const {
        datastore,
        expressDatastore,
        resolveTitle,
        toBFTitle,
    } = config;

    app.get("/hostingcenter", async (req, res) => {
        res.set("Cache-control", `public, max-age=${config.staticMaxAge}`);
        if (req.query.hostingCenterId) {
            const hostingCenterId = String(req.query.hostingCenterId);
            if (/^\d+$/.test(hostingCenterId)) {
                res.json(datastore.GetData(KeyValueChangeKey.HostingCenterInfo, hostingCenterId));
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/battlefield", async (req, res) => {
        res.set("Cache-control", `public, max-age=${config.staticMaxAge}`);
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                let result = expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id);
                if (!result) {
                    res.sendStatus(404);
                    return;
                }
                res.json(result);
                return;
            }
        } else if (req.query.bftitle) {
            try {
                const mapPoint = resolveTitle(String(req.query.bftitle));
                res.json(mapPoint);
            } catch (error) {
                if (typeof error == "number") res.sendStatus(error);
            }
            return;
        }
        res.sendStatus(412);
    });
    
    app.get("/battlefield/:id.json", async (req, res) => {
        res.set("Cache-control", `public, max-age=2592000`);
        if (req.params.id) {
            const id = String(req.params.id);
            if (/^\d+$/.test(id)) {
                let result = expressDatastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id);
                if (!result) {
                    res.sendStatus(404);
                    return;
                }
                res.json(result);
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/supplyline", async (req, res) => {
        res.set("Cache-control", `public, max-age=${config.staticMaxAge}`);
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                let result = expressDatastore.GetData<Supplyline>(KeyValueChangeKey.supplyline, id);
                if (!result) {
                    res.sendStatus(404);
                    return;
                }
                res.json(result);
                return;
            }
        }
        res.sendStatus(412);
    });

    app.get("/bftitle", async (req, res) => {
        res.set("Cache-control", `public, max-age=${config.staticMaxAge}`);
        if (req.query.id) {
            const id = String(req.query.id);
            if (/^\d+$/.test(id)) {
                try {
                    const mapPoint = toBFTitle(id);
                    res.json(mapPoint);
                } catch (error) {
                    if (typeof error == "number") res.sendStatus(error);
                }
                return;
            }
        }
        res.sendStatus(412);
    });
}
