import { Client, KeyValueChangeKey } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import { drawToCanvas } from "hagcp-canvas";
import { loadTemplate } from "hagcp-assets";
import express from "express";
import compression from "compression";
import morgan from "morgan";
import cors from "cors";
import { startAPI } from "./api";
import { cached } from "./cache/cachedItem";
import { getResolveTitle, getToBFTitle } from "./api/battlefieldNaming";
import Mylas from "mylas";
import expressws from 'express-ws';

const staticMaxAge = 300;

export async function startApp(datastore: DataStore, lookupFactions: Map<string, any>, lookupTemplateFaction: Map<string, any>, client?: Client) {
    const cachedBuffer = cached(60 * 15, async () => {
        const canvas = await drawToCanvas(expressDatastore, datastore, id => lookupFactions.get(id).color, lookupFactions);
        return canvas.toBuffer("image/jpeg");
    });
    const { version } = await Mylas.json.load("package.json");
    console.log(`Loaded version ${version}`);

    const app = express();
    expressws(app, undefined, { wsOptions: { perMessageDeflate: true, } });
    const expressDatastore = new DataStore;
    await loadTemplate(expressDatastore, KeyValueChangeKey.battlefield);
    await loadTemplate(expressDatastore, KeyValueChangeKey.supplyline);
    await loadTemplate(expressDatastore, KeyValueChangeKey.accesspoint);
    await loadTemplate(expressDatastore, KeyValueChangeKey.accesspointtemplate);
    await loadTemplate(expressDatastore, KeyValueChangeKey.capital);

    app.use((_, res, next) => {
        res.setHeader("X-Powered-By", `hgwarmap ${version}`);
        next();
    });

    app.use(morgan("tiny"));
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());
    app.use(cors());
    app.use(express.static("client/build", {
        setHeaders: (res, path) => {
            if (path.match(/\.(html)$/)) {
                res.set("Cache-control", `public, max-age=${staticMaxAge}`);
                return;
            }

            if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|json)$/)) {
                res.set("Cache-control", "public, max-age=604800, immutable");
            }
        },
    }));

    app.get("/status", (_, res) => {
        res.set("Cache-control", "no-store");
        res.sendStatus(client?.connected ? 200 : 503);
    });

    app.get("/version", (_, res) => {
        res.set("Cache-control", "no-store");
        res.send(version);
    });

    app.get("/warmap.jpeg", async (_, res) => {
        if (!client) {
            res.sendStatus(503);
            return;
        }
        res.contentType("image/jpeg");
        res.set("Cache-control", "public, max-age=60");
        res.send(await cachedBuffer());
    });

    app.use("/api", startAPI({
        datastore,
        lookupFactions,
        expressDatastore,
        lookupTemplateFaction,
        client,
        resolveTitle: getResolveTitle(expressDatastore),
        toBFTitle: getToBFTitle(expressDatastore),
        staticMaxAge,
    }));

    return app;
}
