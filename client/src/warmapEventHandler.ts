import EventEmitter from "events";
import { battle, battlefieldstatus, supplylinestatus } from "./map/mapInterfaces";
import capital from "hagcp-assets/json/capital.json";

const ShortToTemplateId = new Map([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
]);
const chunkSize = 1000;

export class WarState extends EventEmitter {
    // Factions
    public readonly lookupFactions: Map<string, any>;
    public readonly lookupFactionsByTemplateId: Map<string, any>;
    public currentFaction: string | null;

    // Battles
    private battles: Set<string>;
    private readonly battlesMap: Map<string, battle>;

    // Statuses
    public readonly battlefieldstatusMap: Map<string, battlefieldstatus>;
    public readonly supplylinestatusMap: Map<string, supplylinestatus>;

    // Constants
    public readonly capitals: Set<string>;
    public readonly battlefields: Map<string, any>;
    public readonly supplylines: Map<string, any>;

    // War
    private warid?: string;
    private newWarCB?: (warid: string) => void;

    constructor() {
        super();
        this.setMaxListeners(32);

        // Factions
        this.lookupFactions = new Map();
        this.lookupFactionsByTemplateId = new Map();
        this.currentFaction = null;

        // Battles
        this.battles = new Set();
        this.battlesMap = new Map();

        // Statuses
        this.battlefieldstatusMap = new Map();
        this.supplylinestatusMap = new Map();

        // Constants
        this.capitals = new Set(capital.map(e => e.battlefieldId));
        this.battlefields = new Map();
        this.supplylines = new Map();

        // Load battlefields and supplylines from api
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

        const onloadEvent = () => {
            console.log("Page loaded!");
            const loader = document.getElementById("loader");
            loader?.classList.add("hidden");
            setTimeout(() => {
                loader?.remove();
                window.removeEventListener("load", onloadEvent);
            }, 2000);
            // Start update loop
            this.loop();
        };
        window.addEventListener("load", onloadEvent);
    }

    public set onNewWar(func: (warid: string) => void) {
        this.newWarCB = func;
    }

    public get currentFactionId(): string | null {
        if (!this.currentFaction) return null;
        const id = ShortToTemplateId.get(this.currentFaction);
        if (!id) return null;
        return this.lookupFactionsByTemplateId.get(id).factionId;
    }

    /**
     * getApi fetches data from http api
     * @param endpoint http endpoint to call
     * @returns the returned json data
     */
    private getApi = async (endpoint: string) => (await fetch(endpoint)).json();

    /**
     * loop checks state of warmap in a loop
     */
    public async loop() {
        console.log("Loop");
        try {
            // Get deleted supplylines
            await this.getApi("/api/deletesupplylinestatus.json").then(deletesupplylinestatus => {
                deletesupplylinestatus.forEach((e: string) => {
                    this.supplylinestatusMap.delete(e);
                    this.emit(`supplylinestatusdelete${e}`);
                });
            });

            // Get most recent warmap data
            await Promise.all([
                // Get all factions in this war
                this.getApi("/api/factions.json").then(factions => {
                    factions.forEach((element: any) => {
                        this.lookupFactions.set(element.factionId, element);
                        this.lookupFactionsByTemplateId.set(element.factionTemplateId, element);
                    });
                }),
                // Get recent battlefield statuses
                this.getApi("/api/battlefieldstatus.json").then(battlefieldstatus => {
                    // Check if new war has started
                    const first = battlefieldstatus?.[0];
                    if (first && first.warid !== this.warid) {
                        if (this.warid) {
                            this.lookupFactions.clear();
                            this.lookupFactionsByTemplateId.clear();
                            this.battlefieldstatusMap.clear();
                            this.supplylinestatusMap.clear();
                        }
                        this.warid = first.warid;
                        if (this.warid) this.newWarCB?.(this.warid);
                    }
                    // Update battlefields
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
                // Get recent supplyline statuses
                this.getApi("/api/supplylinestatus.json").then(supplylinestatus => {
                    // Update supplylines
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

            // Get battle information
            if (this.currentFaction) {
                const newBattles = await this.getApi(`/api/factionbattles/${this.currentFaction}.json`) as battle[];

                // Make new set of battles
                const newBattlesSet = new Set(newBattles.map(v => v.id));
                // Delete battles that don't exist anymore
                this.battles.forEach(element => {
                    if (!newBattlesSet.has(element)) this.emit(`battledelete${element}`);
                });
                // Set battles to new battles
                this.battles = newBattlesSet;

                // Update all battles on the map
                newBattles.forEach(element => {
                    this.battlesMap.set(element.id, element);
                    this.emit(`battlesetmapEntityId${element.mapEntityId}`, element.id);
                });
            }

            // Succes next loop in 5 seconds
            setTimeout(() => {
                this.loop();
            }, 5000);
        } catch (error) {
            console.error(error);
            // Error next loop in 60 seconds
            setTimeout(() => {
                this.loop();
            }, 60000);
        }
    }

    /**
     * GetBattle looks up a battle
     * @param battleId id of the battle to look up
     * @returns the battle or undefined
     */
    public GetBattle = (battleId?: string): battle | undefined =>
        battleId ? this.battlesMap.get(battleId) : undefined;
}
