import { ClassKeys, Client, keyToClass, KeyValueChangeKey, ResponseType } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import mylas from "mylas";
import { gzipSync } from "zlib";
import Long from "long";
import dotenv from "dotenv";
dotenv.config();

export async function startClient(datastore: DataStore, lookupFactions: Map<string, any>, lookupTemplateFaction: Map<string, any>) {
    const client = await Client.connectToHQ(
        String(process.env.HAG_USERAGENT),
        String(process.env.HAG_USERNAME),
        String(process.env.HAG_PASSWORD));
    if (!client) return;
    const startTime = Date.now();
    let saveMapTimer: NodeJS.Timer;
    let warId: string | null = null;

    async function saveMapNow() {
        const date = (new Date).toISOString().replace(/[-:.]/g, "");
        if (warId) {
            if (!client) return;
            await client.sendPacketAsync(ClassKeys.query_war_catalogue_request);
            const queryServerInfo = await client.sendPacketAsync(ClassKeys.QueryServerInfo);
            const outDir = `./saves`;
            console.log(`saving to: ${outDir}/${warId}/${date}.jsonc`);
            await mylas.buf.save(`${outDir}/${warId}/${date}.protodata`,
                gzipSync(keyToClass.get(ClassKeys.KeyValueChangeSet)!.toBuffer!({
                    set: [
                        ...datastore.ItemstoreToKeyValueSet(KeyValueChangeKey.battlefieldstatus).set!,
                        ...datastore.ItemstoreToKeyValueSet(KeyValueChangeKey.supplylinestatus).set!,
                    ]
                }))
            );

            mylas.json.saveS(`${outDir}/${warId}/${date}.jsonc`, {
                factions: Array.from(lookupFactions.values()),
                queryServerInfo,
            });
        }
    }

    client.once("loggedin", async () => {
        await client.sendPacketAsync(ClassKeys.query_war_catalogue_request);
        await client.sendPacketAsync(ClassKeys.subscribewarmapview);
        await client.sendPacketAsync(ClassKeys.SubscribeHostingCenterInfoView);
        saveMapTimer = setInterval(saveMapNow, 30000);
    }).on(ClassKeys.login2_result, data => {
        if (data && data.currentplayer) {
            datastore.SetData("CurrentWar", "0", String(data.currentplayer.war));
        }
    }).on(ClassKeys.query_war_catalogue_response, (data) => {
        data.warcataloguedata[0].warCatalogueFactions.forEach((element: { factionTemplateId: any; color: string; factionId: string; }) => {
            switch (element.factionTemplateId) {
                case "1":
                    element.color = "#0f0";
                    break;
                case "2":
                    element.color = "#00f";
                    break;
                case "3":
                    element.color = "#f00";
                    break;
                default:
                    element.color = "#000";
                    break;
            }
            lookupFactions.set(element.factionId, element);
            lookupTemplateFaction.set(element.factionTemplateId, element);
        });
    }).on(ClassKeys.join_war_response, async (data: { msg: ResponseType, redirectSrv?: string; }) => {
        if (data.msg === ResponseType.ok) {
            if (data.redirectSrv) {
                console.log(`redirectSrv detected: ${data.redirectSrv}`);
            }
            await client.sendPacketAsync(ClassKeys.unsubscribewarmapview);
            await saveMapNow();
            saveMapTimer?.refresh?.();
            datastore.ResetData(KeyValueChangeKey.battlefieldstatus);
            datastore.ResetData(KeyValueChangeKey.supplylinestatus);
            datastore.ResetData(KeyValueChangeKey.battle);
            lookupFactions.clear();
            await client.sendPacketAsync(ClassKeys.subscribewarmapview);
            await client.sendPacketAsync(ClassKeys.query_war_catalogue_request);
        } else {
            console.error(`ERROR: ${data}`);
        }
    }).on("message", async (typetext, data) => {
        if (typetext == ClassKeys.KeyValueChangeSet) {
            datastore.SaveData(data);
            if (data?.set) {
                for (const iterator of data.set) {
                    if (iterator.key === KeyValueChangeKey.war) {
                        const value = iterator.value;
                        warId = value.id;
                        if (value.sequelwarid !== "0") {
                            console.log(`${value.id} ended, switching to: ${value.sequelwarid}`);
                            datastore.SetData("CurrentWar", "0", String(value.sequelwarid));
                            client.sendPacket(ClassKeys.join_war_request, {
                                warid: Long.fromString(value.sequelwarid),
                                factionid: Long.ZERO,
                                playedFirstBlood: 0,
                            });
                        }
                    }
                }
            }
            if (data?.delete) for (const iterator of data.delete) {
                if (iterator.key === KeyValueChangeKey.supplylinestatus) {
                    datastore.SetData("deletesupplylinestatus", iterator.value, iterator.value);
                    setTimeout(() => {
                        datastore.SaveData({ delete: [{ key: "deletesupplylinestatus", value: iterator.value }] });
                    }, 60000);
                }
            }
        }
    }).on("closed", () => {
        console.log("Socket closed!");
        console.log(`After ${Date.now() - startTime}ms`);
        clearInterval(saveMapTimer);
        process.exit(1);
    });
    return client;
}
