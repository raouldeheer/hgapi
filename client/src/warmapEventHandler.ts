import EventEmitter from "events";
import { DataStore, IKeyValueChangeSetResult } from "hagcp-utils";
import { battle } from "./map/mapInterfaces";
import battlefield from "hagcp-assets/json/battlefield.json";

export class WarmapEventHandler extends EventEmitter {
    public readonly lookupFactions: Map<string, any>;
    public readonly lookupFactionsByTemplateId: Map<string, any>;
    private readonly tagToShort = new Map<string, string>([
        ["Soviet Union", "SU"],
        ["Germany", "GE"],
        ["United States", "US"]
    ]);
    public readonly datastore: DataStore;
    constructor() {
        super();
        this.setMaxListeners(99);
        this.lookupFactions = new Map<string, any>();
        this.lookupFactionsByTemplateId = new Map<string, any>();
        this.datastore = new DataStore();
        battlefield.forEach((element: { id: string; }) =>
            this.datastore.SetData("battlefield", element.id, element));
        setInterval(() => {
            this.loop();
        }, 10000);
    }

    private async getApi(endpoint: string) {
        return (await fetch(`http://192.168.2.65:4269${endpoint}`)).json();
    }

    public async loop() {
        console.log("Loop");
        const [factions, battlefieldstatus, supplylinestatus, deletesupplylinestatus] = await Promise.all([
            this.getApi("/api/factions.json"),
            this.getApi("/api/battlefieldstatus.json"),
            this.getApi("/api/supplylinestatus.json"),
            this.getApi("/api/deletesupplylinestatus.json")
        ]);

        factions.forEach((element: any) => {
            this.lookupFactions.set(element.factionId, element);
            this.lookupFactionsByTemplateId.set(element.factionTemplateId, element);
        });

        this.datastore.SaveData({ delete: deletesupplylinestatus });
        deletesupplylinestatus.forEach((e: string) => {
            this.emit(`supplylinestatusdelete${e}`);
        });

        const chunkSize = 1000;
        for (let i = 0; i < battlefieldstatus.length; i += chunkSize) {
            const chunk = battlefieldstatus.slice(i, i + chunkSize);
            setTimeout(() => {
                chunk.forEach((element: any) => {
                    if (!this.datastore.HasData("battlefieldstatus", element.id)) {
                        this.datastore.SetData("battlefieldstatus", element.id, element);
                        this.emit(`battlefield${element.battlefieldid}`, element.id);
                    }
                });
            }, 1);
        }
        for (let i = 0; i < supplylinestatus.length; i += chunkSize) {
            const chunk = supplylinestatus.slice(i, i + chunkSize);
            setTimeout(() => {
                chunk.forEach((element: any) => {
                    if (!this.datastore.HasData("supplylinestatus", element.id)) {
                        this.datastore.SetData("supplylinestatus", element.id, element);
                        this.emit(`supplyline${element.supplylineid}`, element.id);
                    }
                });
            }, 1);
        }
    }

    public handleNewData(data: IKeyValueChangeSetResult) {
        for (const iterator of (data.set || [])) {
            switch (iterator.key) {
                case "battle": // TODO add battles to loop.
                    this.emit(`battlesetmapEntityId${iterator.value.mapEntityId}`, iterator.value.id);
                    break;
            }
        }
        for (const iterator of (data.delete || [])) // TODO add battledelete to loop.
            this.emit(`${iterator.key}delete${iterator.value}`);
    }

    public GetBattle = (battleId?: string): battle | null => battleId
        ? this.datastore.GetData<battle>("battle", battleId)
        : null;

}
