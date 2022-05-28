import { Component } from "react";
import { Circle, Line } from "react-konva";
import { WarState } from "../warmapEventHandler";
import { battleIdToColor, BattleType } from "./battleUtils";
import { supplyline } from "./mapInterfaces";

interface SupplylineProps {
    id: string;
    warState: WarState;
}

interface SupplylineState {
    battleId: string | undefined;
    supplylinestatusId: string | undefined;
}

export default class Supplyline extends Component<SupplylineProps, SupplylineState> {
    state: Readonly<SupplylineState> = {
        battleId: undefined,
        supplylinestatusId: undefined,
    };
    warState: WarState;

    constructor(props: SupplylineProps) {
        super(props);
        this.warState = props.warState;
    }

    statusCallback = (data: string) => {
        this.setState(state => ({ ...state, supplylinestatusId: data }));
        this.warState.once(`supplylinestatusdelete${data}`, () => {
            this.setState(state => ({ ...state, supplylinestatusId: undefined }));
        });
    };

    battleDeleteCallback = () => {
        this.setState(state => ({ ...state, battleId: undefined }));
    };

    battleCallback = (data: string) => {
        this.setState(state => ({ ...state, battleId: data }));
        this.warState.removeListener(`battledelete${data}`, this.battleDeleteCallback);
        this.warState.once(`battledelete${data}`, this.battleDeleteCallback);
    };

    componentDidMount(): void {
        this.warState.on(`supplyline${this.props.id}`, this.statusCallback);
        this.warState.on(`battlesetmapEntityId${this.props.id}`, this.battleCallback);
        this.warState.once("loaded", () => {
            this.forceUpdate();
        });
    }

    componentWillUnmount(): void {
        this.warState.removeListener(`supplyline${this.props.id}`, this.statusCallback);
        this.warState.removeListener(`battlesetmapEntityId${this.props.id}`, this.battleCallback);
    }

    render() {
        const supplyline: supplyline = this.warState.supplylines.get(this.props.id);
        const posx1 = supplyline?.posx1 || 0;
        const posy1 = supplyline?.posy1 || 0;
        const posx2 = supplyline?.posx2 || 0;
        const posy2 = supplyline?.posy2 || 0;

        if (this.state.battleId && !this.warState.activeBattles.has(this.state.battleId))
            this.battleDeleteCallback();

        let color = "#888";
        if (this.state.supplylinestatusId) {
            const status = this.warState.supplylinestatusMap.get(this.state.supplylinestatusId);
            if (status) color = this.warState.lookupFactions.get(status.factionid)?.color;
        }

        const battle = this.warState.GetBattle(this.state.battleId);

        return <>
            <Line points={[posx1, posy1, posx2, posy2]} stroke={color} strokeWidth={8} />
            {battle ? <Circle
                key={battle.id}
                x={posx1 + (posx2 - posx1) * Number(battle.position)}
                y={posy1 + (posy2 - posy1) * Number(battle.position)}
                radius={10}
                fill={battleIdToColor(this.warState, this.state.battleId, BattleType.Skirmish)}
            /> : null}
        </>;
    }
}
