import EventEmitter from "events";
import { battle, battlefieldstatus, supplylinestatus } from "./map/mapInterfaces";
import capital from "hagcp-assets/json/capital.json";

const ShortToTemplateId = new Map([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
]);
const chunkSize = 1000;

export class WarmapEventHandler extends EventEmitter {
    public readonly lookupFactions: Map<string, any>;
    public readonly lookupFactionsByTemplateId: Map<string, any>;
    public currentFaction: string | null;
    public battles: Set<string>;
    private readonly battlesMap: Map<string, battle>;
    public readonly battlefieldstatusMap: Map<string, battlefieldstatus>;
    public readonly supplylinestatusMap: Map<string, supplylinestatus>;
    public readonly capitals: Set<string>;
    public readonly battlefields: Map<string, any>;
    public readonly supplylines: Map<string, any>;

    constructor() {
        super();
        this.setMaxListeners(32);
        this.currentFaction = null;
        this.battles = new Set();
        this.battlesMap = new Map();
        this.battlefieldstatusMap = new Map();
        this.supplylinestatusMap = new Map();
        this.lookupFactions = new Map();
        this.lookupFactionsByTemplateId = new Map();
        this.capitals = new Set();
        this.battlefields = new Map();
        this.supplylines = new Map();
        capital.forEach(element => {
            this.capitals.add(element.battlefieldId);
        });

        (async () => {
            await Promise.all([
                fetch("/assets/battlefield.json").then(value => value.json()).then(battlefield => {
                    battlefield.forEach((element: { id: string; }) => {
                        this.battlefields.set(element.id, element);
                    });
                }),
                fetch("/assets/supplyline.json").then(value => value.json()).then(supplyline => {
                    supplyline.forEach((element: { id: string; }) => {
                        this.supplylines.set(element.id, element);
                    });
                }),
            ]);
        })();

        window.addEventListener("load", () => {
            console.log("Page loaded!");
            setTimeout(() => {
                this.loop();
            }, 500);
        });
    }

    public get currentFactionId(): string | null {
        if (!this.currentFaction) return null;
        const id = ShortToTemplateId.get(this.currentFaction);
        if (!id) return null;
        return this.lookupFactionsByTemplateId.get(id).factionId;
    }

    private async getApi(endpoint: string) {
        return (await fetch(endpoint)).json();
    }

    public async loop() {
        console.log("Loop");
        try {
            await this.getApi("/api/deletesupplylinestatus.json").then(deletesupplylinestatus => {
                deletesupplylinestatus.forEach((e: string) => {
                    this.supplylinestatusMap.delete(e);
                    this.emit(`supplylinestatusdelete${e}`);
                });
            });

            await Promise.all([
                this.getApi("/api/factions.json").then(factions => {
                    factions.forEach((element: any) => {
                        this.lookupFactions.set(element.factionId, element);
                        this.lookupFactionsByTemplateId.set(element.factionTemplateId, element);
                    });
                }),
                this.getApi("/api/battlefieldstatus.json").then(battlefieldstatus => {
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
                }),
                this.getApi("/api/supplylinestatus.json").then(supplylinestatus => {
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
                }),
            ]);

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

            setTimeout(() => {
                this.loop();
            }, 5000);
        } catch (error) {
            console.error(error);
            setTimeout(() => {
                this.loop();
            }, 60000);
        }
    }

    public GetBattle = (battleId?: string): battle | undefined =>
        battleId ? this.battlesMap.get(battleId) : undefined;
}
