import { ClassKeys, Client, KeyValueChangeKey, ResponseType, PacketClass, Packets } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import mylas from "mylas";
import { gzipSync } from "zlib";
import Long from "long";
import dotenv from "dotenv";
import { Faction } from "./interfaces";
import { toHGMap } from "./hgmap";
dotenv.config();

export async function startClient(datastore: DataStore, lookupFactions: Map<string, Faction>, lookupTemplateFaction: Map<string, Faction>) {
    const client = await Client.connectToHQ(
        String(process.env.HAG_USERAGENT),
        String(process.env.HAG_USERNAME),
        String(process.env.HAG_PASSWORD));
    if (!client) return;
    const startTime = Date.now();
    let saveMapTimer: NodeJS.Timer;

    async function saveMapNow() {
        const date = (new Date).toISOString().replace(/[-:.]/g, "");
        const warId = datastore.GetData("CurrentWar", "0");
        if (warId) {
            if (!client) return;
            const catalogueResponse: Packets.query_war_catalogue_response = await client.sendClassAsync(PacketClass.query_war_catalogue_request);
            const queryServerInfo: Packets.QueryServerInfoResponse = await client.sendClassAsync(PacketClass.QueryServerInfo);
            const outDir = `./saves`;
            console.log(`saving to: ${outDir}/${warId}/${date}.hgmap`);

            const thisWar = catalogueResponse.warcataloguedata.find(catalogue => String(catalogue.id) === warId);

            await mylas.buf.save(`${outDir}/${warId}/${date}.hgmap`, gzipSync(toHGMap(
                thisWar?.name || "0000",
                thisWar?.warCatalogueFactions || (Array.from(lookupFactions.values() as unknown as any)),
                queryServerInfo,
                datastore,
            )));
        }
    }

    client.once("loggedin", async () => {
        await client.sendClassAsync(PacketClass.query_war_catalogue_request);
        await client.sendClassAsync(PacketClass.subscribewarmapview);
        await client.sendClassAsync(PacketClass.SubscribeHostingCenterInfoView);
        saveMapTimer = setInterval(saveMapNow, 30000);
    }).on(ClassKeys.login2_result, data => {
        if (data && data.currentplayer) {
            datastore.SetData("CurrentWar", "0", String(data.currentplayer.war));
        }
    }).on(ClassKeys.query_war_catalogue_response, (data) => {
        data.warcataloguedata[0].warCatalogueFactions.forEach((element: any) => {
            const faction = element as unknown as Faction;
            switch (element.factionTemplateId.toString()) {
                case "1":
                    faction.color = "#0f0";
                    break;
                case "2":
                    faction.color = "#00f";
                    break;
                case "3":
                    faction.color = "#f00";
                    break;
                default:
                    faction.color = "#000";
                    break;
            }
            lookupFactions.set(element.factionId.toString(), faction);
            lookupTemplateFaction.set(element.factionTemplateId.toString(), faction);
        });
    }).on(ClassKeys.join_war_response, async data => {
        if (data.msg === ResponseType.ok) {
            if (data.redirectSrv) {
                console.log(`redirectSrv detected: ${data.redirectSrv}`);
            }
            await client.sendClassAsync(PacketClass.unsubscribewarmapview);
            saveMapTimer?.refresh?.();
            datastore.ResetData(KeyValueChangeKey.battlefieldstatus);
            datastore.ResetData(KeyValueChangeKey.supplylinestatus);
            datastore.ResetData(KeyValueChangeKey.battle);
            lookupFactions.clear();
            await client.sendClassAsync(PacketClass.subscribewarmapview);
            await client.sendClassAsync(PacketClass.query_war_catalogue_request);
        } else {
            console.error("ERROR: join_war_response");
            console.error(data);
        }
    }).on(ClassKeys.KeyValueChangeSet, data => {
        datastore.SaveData(data);
        if (data?.set) {
            for (const iterator of data.set) {
                if (iterator.key === KeyValueChangeKey.war) {
                    const value = iterator.value;
                    if (value.sequelwarid !== "0") {
                        console.log(`${value.id} ended, switching to: ${value.sequelwarid}`);
                        datastore.SetData("CurrentWar", "0", String(value.sequelwarid));
                        client.sendClass(PacketClass.join_war_request, {
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
    }).on("close", () => {
        console.log("Socket closed!");
        console.log(`After ${Date.now() - startTime}ms`);
        clearInterval(saveMapTimer);
        process.exit(1);
    });
    return client;
}
