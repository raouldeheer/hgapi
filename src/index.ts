import { DataStore } from "hagcp-utils";
import { startApp } from "./app";
import { startClient } from "./client";
import ip from "ip";
import { Faction } from "./interfaces";

const expressPort = 4269;
const lookupFactions = new Map<string, Faction>();
const lookupTemplateFaction = new Map<string, Faction>();
const datastore = new DataStore;

(async () => {
    const client = await startClient(datastore, lookupFactions, lookupTemplateFaction);
    if (!client) {
        setTimeout(() => {
            process.exit(1);
        }, 60000);
    }

    setInterval(() => {
        if (!client?.connected) {
            console.error("Lost connection");
            process.exit(1);
        }
    }, 120000);

    const app = await startApp(datastore, lookupFactions, lookupTemplateFaction, client);

    app.listen(expressPort, ip.address(), () => {
        console.log(`Listing on http://${ip.address()}:${expressPort}/`);
    });
})();
