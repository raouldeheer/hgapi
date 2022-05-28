import EventEmitter from "events";
import { battle, battlefieldstatus, supplylinestatus } from "./map/mapInterfaces";
import capital from "hagcp-assets/json/capital.json";
import sectorsraw from "./json/sectors.json";
import { IKeyValueChangeSetResult } from "hagcp-utils";

const sectors = sectorsraw.map(v => ({
    index: v.index,
    battlefields: new Set(v.bfsSector),
    supplylines: new Set(v.supsSector),
}));

const ShortToTemplateId = new Map([
    ["SU", "3"],
    ["GE", "2"],
    ["US", "1"],
]);

const websocketURL = `${(window.location.protocol === "https:" ? "wss:" : "ws:")}//${window.location.hostname}:${window.location.port}`;

export class WarState extends EventEmitter {
    // Factions
    public readonly lookupFactions: Map<string, any>;
    public readonly lookupFactionsByTemplateId: Map<string, any>;
    private _currentFaction: string | null;

    // Battles
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
    public activeBattles: Set<string>;

    // Online
    private onlineCB?: (status: string) => void;

    constructor() {
        super();
        this.setMaxListeners(32);

        // Factions
        this.lookupFactions = new Map();
        this.lookupFactionsByTemplateId = new Map();
        this._currentFaction = null;

        // Battles
        this.battlesMap = new Map();

        // Statuses
        this.battlefieldstatusMap = new Map();
        this.supplylinestatusMap = new Map();

        // Constants
        this.capitals = new Set(capital.map(e => e.battlefieldId));
        this.battlefields = new Map();
        this.supplylines = new Map();

        // War
        this.activeBattles = new Set();

        const onloadEvent = async () => {
            await Promise.all([
                // Load battlefields from assets
                fetch("/assets/battlefield.json").then(value => value.json()).then(battlefield => {
                    battlefield.forEach((element: { id: string; }) => {
                        this.battlefields.set(element.id, element);
                    });
                }),
                // Load supplylines from assets
                fetch("/assets/supplyline.json").then(value => value.json()).then(supplyline => {
                    supplyline.forEach((element: { id: string; }) => {
                        this.supplylines.set(element.id, element);
                    });
                }),
                // Load factions from api
                fetch("/api/factions.json").then(value => value.json()).then(factions => factions.forEach((element: any) => {
                    this.lookupFactions.set(element.factionId, element);
                    this.lookupFactionsByTemplateId.set(element.factionTemplateId, element);
                })),
            ]);

            // Emit page loaded
            this.emit("loaded");
            console.log("Page loaded!");

            // Remove loader
            const loader = document.getElementById("loader");
            loader?.classList.add("hidden");
            setTimeout(() => {
                loader?.remove();
                window.removeEventListener("load", onloadEvent);
            }, 2000);

            // start mapstatus socket
            this.connectToMapStatus();
        };
        window.addEventListener("load", onloadEvent);
    }

    private connectToMapStatus() {
        // Open socket
        const socket = new WebSocket(`${websocketURL}/api/socket/mapstatus`);

        // Start receiving
        socket.onopen = () => {
            socket.send("start");
        };

        // Handle incoming data
        socket.onmessage = e => {
            const data: IKeyValueChangeSetResult = JSON.parse(e.data);
            this.updateSectors(data);
        };

        // Handle errors and closing
        socket.onclose = e => {
            console.log(e);
            setTimeout(() => {
                this.connectToMapStatus();
            }, 5000);
        };
    }

    private connectToBattles(value: string) {
        // Open socket
        const socket = new WebSocket(`${websocketURL}/api/socket/factionbattles`);

        // Send faction name
        socket.onopen = () => {
            socket.send(value);
        };

        // Handle incoming data
        socket.onmessage = e => {
            const data: {
                deletedBattles: string[],
                changedBattles: battle[],
                activeBattles: string[],
            } = JSON.parse(e.data);

            this.activeBattles.clear();
            data.activeBattles.forEach(element => {
                this.activeBattles.add(element);
            });

            // Delete old battles
            data.deletedBattles.forEach(element => {
                this.emit(`battledelete${element}`);
            });

            // Set new battle information
            data.changedBattles.forEach(element => {
                this.battlesMap.set(element.id, element);
                this.emit(`battlesetmapEntityId${element.mapEntityId}`, element.id);
            });
        };

        // Handle errors and closing
        socket.onclose = e => {
            console.log(e);
            setTimeout(() => {
                this.connectToBattles(value);
            }, 5000);
        };
    }

    public set currentFaction(value: string) {
        this._currentFaction = value;
        this.connectToBattles(value);
    }

    public set onNewWar(func: (warid: string) => void) {
        this.newWarCB = func;
    }

    public set OnlineCallback(func: (status: string) => void) {
        this.onlineCB = func;
    }

    public get currentFactionId(): string | null {
        if (!this._currentFaction) return null;
        const id = ShortToTemplateId.get(this._currentFaction);
        if (!id) return null;
        return this.lookupFactionsByTemplateId.get(id).factionId;
    }

    /**
     * GetBattle looks up a battle
     * @param battleId id of the battle to look up
     * @returns the battle or undefined
     */
    public GetBattle = (battleId?: string): battle | undefined =>
        battleId ? this.battlesMap.get(battleId) : undefined;

    public async updateSectors(data: IKeyValueChangeSetResult) {
        if (data?.delete) {
            data.delete.forEach(element => {
                if (element.key === "supplylinestatus") {
                    this.supplylinestatusMap.delete(element.value);
                    this.emit(`supplylinestatusdelete${element.value}`);
                }
            });
        }
        if (data?.set) {
            const supstatus: supplylinestatus[] = [];
            const bfstatus: battlefieldstatus[] = [];
            for (const element of data.set) {
                if (element.key === "supplylinestatus") supstatus.push(element.value);
                if (element.key === "battlefieldstatus") bfstatus.push(element.value);
                if (element.key === "war") {
                    // Check if new war has started
                    if (element.value.id !== this.warid) {
                        if (this.warid) {
                            this.lookupFactions.clear();
                            this.lookupFactionsByTemplateId.clear();
                            this.battlefieldstatusMap.clear();
                            this.supplylinestatusMap.clear();
                            await fetch("/api/factions.json").then(value => value.json()).then(factions => factions.forEach((element: any) => {
                                this.lookupFactions.set(element.factionId, element);
                                this.lookupFactionsByTemplateId.set(element.factionTemplateId, element);
                            }));
                        }
                        this.warid = element.value.id;
                        if (this.warid) this.newWarCB?.(this.warid);
                    }
                }
            }

            // Update sectors
            sectors.map(sector => ({
                supplylinestatus: supstatus.filter(value => sector.supplylines.has(value.supplylineid)),
                battlefieldstatus: bfstatus.filter(value => sector.battlefields.has(value.battlefieldid)),
            })).forEach(chunk => {
                setTimeout(() => {
                    // Apply supplylinestatuses
                    chunk.supplylinestatus.forEach(element => {
                        if (!this.supplylinestatusMap.has(element.id)) {
                            this.supplylinestatusMap.set(element.id, element);
                            this.emit(`supplyline${element.supplylineid}`, element.id);
                        }
                    });
                    // Apply battlefieldstatuses
                    chunk.battlefieldstatus.forEach(element => {
                        if (!this.battlefieldstatusMap.has(element.id) ||
                            this.battlefieldstatusMap.get(element.id)!.factionid !== element.factionid) {
                            this.battlefieldstatusMap.set(element.id, element);
                            this.emit(`battlefield${element.battlefieldid}`, element.id);
                        }
                    });
                }, 1);
            });
        }
    }
}
