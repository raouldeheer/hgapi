import { WarmapEventHandler } from "../warmapEventHandler";
import { MissionStatus } from "./mapInterfaces";

export function battleIdToColor(
    warmapEventHandler: WarmapEventHandler,
    battleId: string | undefined,
    factionColor: string,
    battleType: "0" | "1"
) {
    const battle = warmapEventHandler.GetBattle(battleId);
    let battleColor = "Black";
    if (battle) {
        if (battle.MissionDetails.response === 0) {
            const status = battle.MissionDetails.info?.status;
            switch (status) {
                case MissionStatus.MissionOpen:
                    battleColor = factionColor;
                    const totalResources = battle.MissionDetails.armyResources.reduce<Map<number, number>>((prev, curr) => {
                        if (warmapEventHandler.currentFactionId !== curr.factionId) return prev;
                        const CategoryId = Number(curr.armyResourceCategoryId);
                        const value = prev.get(CategoryId);
                        prev.set(CategoryId, value ? value + curr.count : curr.count);
                        return prev;
                    }, new Map);
                    if (!battleIsFun(totalResources, battleType)) battleColor = "Pink";
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
    const ticketsRequired = (battleType == "0") ? 18 : 12;
    const ticketsInfantry = Math.floor(totalResources.get(1)! / 12);

    const ticketsParas = Math.floor(totalResources.get(4)! / 12);
    const ticketsParasAirborne = Math.min(
        Math.floor(totalResources.get(4)! / 12),
        Math.floor(totalResources.get(10)! / 4));

    const ticketsRecons = Math.floor(totalResources.get(6)! / 10);

    const ticketsTanks = Math.min(
        Math.floor(totalResources.get(5)! / 10),
        Math.floor(totalResources.get(12)! / 10) // ticketsTanks
        + Math.floor(totalResources.get(7)! / 10)
        + Math.floor(totalResources.get(17)! / 10)
        + Math.floor(totalResources.get(8)! / 10)
        + Math.floor(totalResources.get(18)! / 10)
    );

    const ticketsPlanes = Math.min(
        Math.floor(totalResources.get(2)! / 10),
        Math.floor(totalResources.get(21)! / 10) // ticketsPlanes
        + Math.floor(totalResources.get(20)! / 10)
        + Math.floor(totalResources.get(3)! / 10)
    );

    const ticketsTotal = battleType == "1"
        ? ticketsInfantry
        : (ticketsInfantry
            + ticketsParas
            + ticketsParasAirborne
            + ticketsRecons
            + ticketsTanks
            + ticketsPlanes);

    return ((ticketsInfantry + ticketsParas + ticketsParasAirborne) >= ticketsRequired / 2)
        && (ticketsTotal >= ticketsRequired);
}
