import { WarState } from "../warmapEventHandler";
import { MissionStatus } from "./mapInterfaces";

const enum ResourceTypes {
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

export const enum BattleType {
    Assault,
    Skirmish,
}

const enum BattleColor {
    Default = "Black",
    OpenNormal = "White",
    NotFun = "Aqua",
    Queued = "Yellow",
    Running = "Orange",
    Ending = "DarkRed",
}

export function battleIdToColor(
    warmapEventHandler: WarState,
    battleId: string | undefined,
    battleType: BattleType,
    defaultColor?: string
) {
    const battle = warmapEventHandler.GetBattle(battleId);
    let battleColor = defaultColor || BattleColor.Default;
    if (battle && battle.MissionDetails.response === 0) {
        const status = battle.MissionDetails.info?.status;
        switch (status) {
            case MissionStatus.MissionOpen:
                battleColor = BattleColor.OpenNormal;
                const currFaction = warmapEventHandler.currentFactionId;
                const totalResources = battle?.MissionDetails?.armyResources?.reduce?.<Map<number, number>>((prev, curr) => {
                    if (currFaction !== curr.factionId) return prev;
                    const CategoryId = Number(curr.armyResourceCategoryId);
                    const value = prev.get(CategoryId);
                    prev.set(CategoryId, value ? value + curr.count : curr.count);
                    return prev;
                }, new Map());
                if (!totalResources) return battleColor;
                if (!battleIsFun(totalResources, battleType)) battleColor = BattleColor.NotFun;
                if (battle.MissionDetails.factions.reduce(
                    (prev, curr) => prev + (currFaction !== curr.factionId ? curr?.players?.length : 0 || 0), 0
                ) >= 4) battleColor = BattleColor.Queued;
                break;
            case MissionStatus.MissionRunning:
                battleColor = BattleColor.Running;
                break;
            case MissionStatus.MissionEnding:
                battleColor = BattleColor.Ending;
                break;
        }
    }
    return battleColor;
}

function battleIsFun(totalResources: Map<number, number>, battleType: BattleType) {
    const ticketsRequired = battleType === BattleType.Assault ? 18 : 12;

    const getValue = (type: ResourceTypes, divider: number) => Math.floor((totalResources.get(type) || 0) / divider);

    const ticketsInfantry = getValue(ResourceTypes.infantryman, 12);

    const ticketsParas = getValue(ResourceTypes.paratrooper, 12);
    const ticketsParasAirborne = Math.min(
        getValue(ResourceTypes.paratrooper, 12),
        getValue(ResourceTypes.transport_plane, 4));

    const ticketsTotal = battleType === BattleType.Skirmish
        ? ticketsInfantry
        : (ticketsInfantry
            + ticketsParas
            + ticketsParasAirborne
            + getValue(ResourceTypes.recon, 10)
            + Math.min(
                getValue(ResourceTypes.tank_crew, 10),
                getValue(ResourceTypes.light_armor, 10) // ticketsTanks
                + getValue(ResourceTypes.medium_armor, 10)
                + getValue(ResourceTypes.heavy_armor, 10)
                + getValue(ResourceTypes.tank_destroyer, 10)
                + getValue(ResourceTypes.heavy_tank_destroyer, 10)
            ) + Math.min(
                getValue(ResourceTypes.fighter_pilot, 10),
                getValue(ResourceTypes.recon_plane, 10) // ticketsPlanes
                + getValue(ResourceTypes.fighter_plane, 10)
                + getValue(ResourceTypes.heavy_fighter_plane, 10)
            ));

    return ((ticketsInfantry + ticketsParas + ticketsParasAirborne) >= (ticketsRequired / 2))
        && (ticketsTotal >= ticketsRequired);
}
