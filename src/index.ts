import { DataStore } from "hagcp-utils";
import { startApp } from "./app";
import { startClient } from "./client";
import ip from "ip";

const expressPort = 4269;
const lookupFactions = new Map<string, any>();
const lookupTemplateFaction = new Map<string, any>();
const datastore = new DataStore;

const sleep = (ms: number) => new Promise(res => { setTimeout(res, ms); });

(async () => {
    const client = await startClient(datastore, lookupFactions, lookupTemplateFaction);
    if (!client) {
        await sleep(60*1000);
        process.exit(1);
    }
    const app = await startApp(datastore, client, lookupFactions, expressPort, lookupTemplateFaction);

    app.listen(expressPort, ip.address(), () => {
        console.log(`Listing on http://${ip.address()}:${expressPort}/`);
    });
})();
