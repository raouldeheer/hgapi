import { Client } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import { drawToCanvas } from "hagcp-utils/canvas";
import { loadTemplate } from "hagcp-assets";
import express from "express";
import compression from "compression";
import morgan from "morgan";
import { startAPI } from "./api";
import { cached } from "./cache/cachedItem";

export async function startApp(datastore: DataStore, lookupFactions: Map<string, any>, expressPort: number, lookupTemplateFaction: Map<string, any>, client?: Client) {
    const cachedBuffer = cached(60 * 15, async () => {
        const canvas = await drawToCanvas(expressDatastore, datastore, id => lookupFactions.get(id).color, lookupFactions);
        return canvas.toBuffer("image/jpeg");
    });

    const app = express();
    const expressDatastore = new DataStore;
    await loadTemplate(expressDatastore, "battlefield");
    await loadTemplate(expressDatastore, "supplyline");
    await loadTemplate(expressDatastore, "accesspoint");
    await loadTemplate(expressDatastore, "accesspointtemplate");
    await loadTemplate(expressDatastore, "capital");

    app.use(morgan("tiny"));
    app.use(express.urlencoded({ extended: true }));
    app.use(compression());
    app.use(express.static("client/build", {
        setHeaders: res => {
            res.set("Cache-control", "public, max-age=300");
        }
    }));

    app.get("/status", (_, res) => {
        res.set("Cache-control", "no-store");
        res.sendStatus(client?.connected ? 200 : 503);
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

    app.use("/api", startAPI({ datastore, lookupFactions, expressDatastore, lookupTemplateFaction, client }));

    return app;
}
