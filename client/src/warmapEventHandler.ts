import EventEmitter from "events";
import { battle, battlefieldstatus, supplylinestatus } from "./map/mapInterfaces";

const ShortToTemplateId = new Map([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
])

export class WarmapEventHandler extends EventEmitter {
    public readonly lookupFactions: Map<string, any>;
    public readonly lookupFactionsByTemplateId: Map<string, any>;
    public currentFaction: string | null;
    public battles: Set<string>;
    private readonly battlesMap: Map<string, battle>;
    public readonly battlefieldstatusMap: Map<string, battlefieldstatus>;
    public readonly supplylinestatusMap: Map<string, supplylinestatus>;
    constructor() {
        super();
        // this.setMaxListeners(99);
        this.currentFaction = null;
        this.battles = new Set();
        this.battlesMap = new Map();
        this.battlefieldstatusMap = new Map();
        this.supplylinestatusMap = new Map();
        this.lookupFactions = new Map<string, any>();
        this.lookupFactionsByTemplateId = new Map<string, any>();
        setInterval(async () => {
            await this.loop();
        }, 10000);
    }

    public get currentFactionId() : string | null {
        if (!this.currentFaction) return null;
        const id = ShortToTemplateId.get(this.currentFaction);
        if (!id) return null;
        return this.lookupFactionsByTemplateId.get(id);
    }
    
    private async getApi(endpoint: string) {
        return (await fetch(endpoint)).json();
    }

    public async loop() {
        console.log("Loop");
        const [factions, battlefieldstatus, supplylinestatus, deletesupplylinestatus] = await Promise.all([
            this.getApi("/api/factions.json"),
            this.getApi("/api/battlefieldstatus.json"),
            this.getApi("/api/supplylinestatus.json"),
            this.getApi("/api/deletesupplylinestatus.json"),
        ]);

        factions.forEach((element: any) => {
            this.lookupFactions.set(element.factionId, element);
            this.lookupFactionsByTemplateId.set(element.factionTemplateId, element);
        });

        deletesupplylinestatus.forEach((e: string) => {
            this.supplylinestatusMap.delete(e);
            this.emit(`supplylinestatusdelete${e}`);
        });

        const chunkSize = 1000;
        for (let i = 0; i < battlefieldstatus.length; i += chunkSize) {
            const chunk = battlefieldstatus.slice(i, i + chunkSize);
            setTimeout(() => {
                chunk.forEach((element: any) => {
                    if (!this.battlefieldstatusMap.has(element.id) ||
                        this.battlefieldstatusMap.get(element.id)!.factionid !== element.factionid) {
                        this.battlefieldstatusMap.set(element.id, element);
                        this.emit(`battlefield${element.battlefieldid}`, element.id);
                    }
                });
            }, 1);
        }
        for (let i = 0; i < supplylinestatus.length; i += chunkSize) {
            const chunk = supplylinestatus.slice(i, i + chunkSize);
            setTimeout(() => {
                chunk.forEach((element: any) => {
                    if (!this.supplylinestatusMap.has(element.id)) {
                        this.supplylinestatusMap.set(element.id, element);
                        this.emit(`supplyline${element.supplylineid}`, element.id);
                    }
                });
            }, 1);
        }

        if (this.currentFaction) {
            const newBattles = await this.getApi(`/api/factionbattles/${this.currentFaction}.json`) as battle[];

            const newBattlesSet = new Set(newBattles.map(v => v.id));
            this.battles.forEach(element => {
                if (!newBattlesSet.has(element)) this.emit(`battledelete${element}`);
            });
            this.battles = newBattlesSet;

            newBattles.forEach(element => {
                this.battlesMap.set(element.id, element);
                this.emit(`battlesetmapEntityId${element.mapEntityId}`, element.id);
            });
        }
    }

    public GetBattle = (battleId?: string): battle | undefined =>
        battleId ? this.battlesMap.get(battleId) : undefined;
}
