import { WarmapEventHandler } from "../warmapEventHandler";
import { MissionStatus } from "./mapInterfaces";

enum ResourceTypes {
    infantryman = 1,
    transport_plane = 10,
    motorcycle = 11,
    light_armor = 12,
    terrain_vehicle = 15,
    armoured_car = 16,
    heavy_armor = 17,
    heavy_tank_destroyer = 18,
    fighter_pilot = 2,
    fighter_plane = 20,
    recon_plane = 21,
    heavy_fighter_plane = 3,
    paratrooper = 4,
    tank_crew = 5,
    recon = 6,
    medium_armor = 7,
    tank_destroyer = 8,
    armored_personnel_carrier = 9,
}

export function battleIdToColor(
    warmapEventHandler: WarmapEventHandler,
    battleId: string | undefined,
    battleType: "0" | "1",
    defaultColor?: string
) {
    const battle = warmapEventHandler.GetBattle(battleId);
    let battleColor = defaultColor || "Black";
    if (battle) {
        if (battle.MissionDetails.response === 0) {
            const status = battle.MissionDetails.info?.status;
            switch (status) {
                case MissionStatus.MissionOpen:
                    battleColor = "White";
                    const totalResources = battle.MissionDetails.armyResources.reduce<Map<number, number>>((prev, curr) => {
                        if (warmapEventHandler.currentFactionId !== curr.factionId) return prev;
                        const CategoryId = Number(curr.armyResourceCategoryId);
                        const value = prev.get(CategoryId);
                        prev.set(CategoryId, value ? value + curr.count : curr.count);
                        return prev;
                    }, new Map());
                    if (!battleIsFun(totalResources, battleType)) battleColor = "Aqua";
                    break;
                case MissionStatus.MissionRunning:
                    battleColor = "Orange";
                    break;
                case MissionStatus.MissionEnding:
                    battleColor = "DarkRed";
                    break;
            }
        }

    }
    return battleColor;
}

function battleIsFun(totalResources: Map<number, number>, battleType: "0" | "1") {
    const ticketsRequired = (battleType === "0") ? 18 : 12;

    const getValue = (type: ResourceTypes) => (totalResources.get(type) || 0);

    const ticketsInfantry = Math.floor(getValue(ResourceTypes.infantryman) / 12);

    const ticketsParas = Math.floor(getValue(ResourceTypes.paratrooper) / 12);
    const ticketsParasAirborne = Math.min(
        Math.floor(getValue(ResourceTypes.paratrooper) / 12),
        Math.floor(getValue(ResourceTypes.transport_plane) / 4));

    const ticketsRecons = Math.floor(getValue(ResourceTypes.recon) / 10);

    const ticketsTanks = Math.min(
        Math.floor(getValue(ResourceTypes.tank_crew) / 10),
        Math.floor(getValue(ResourceTypes.light_armor) / 10) // ticketsTanks
        + Math.floor(getValue(ResourceTypes.medium_armor) / 10)
        + Math.floor(getValue(ResourceTypes.heavy_armor) / 10)
        + Math.floor(getValue(ResourceTypes.tank_destroyer) / 10)
        + Math.floor(getValue(ResourceTypes.heavy_tank_destroyer) / 10)
    );

    const ticketsPlanes = Math.min(
        Math.floor(getValue(ResourceTypes.fighter_pilot) / 10),
        Math.floor(getValue(ResourceTypes.recon_plane) / 10) // ticketsPlanes
        + Math.floor(getValue(ResourceTypes.fighter_plane) / 10)
        + Math.floor(getValue(ResourceTypes.heavy_fighter_plane) / 10)
    );

    const ticketsTotal = battleType === "1"
        ? ticketsInfantry
        : (ticketsInfantry
            + ticketsParas
            + ticketsParasAirborne
            + ticketsRecons
            + ticketsTanks
            + ticketsPlanes);

    return ((ticketsInfantry + ticketsParas + ticketsParasAirborne) >= (ticketsRequired / 2))
        && (ticketsTotal >= ticketsRequired);
}
