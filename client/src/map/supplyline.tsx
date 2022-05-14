import { Component } from "react";
import { Circle, Line } from "react-konva";
import { WarState } from "../warmapEventHandler";
import { battleIdToColor, BattleType } from "./battleUtils";

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
    posx1: number;
    posy1: number;
    posx2: number;
    posy2: number;
    warState: WarState;

    constructor(props: SupplylineProps) {
        super(props);
        this.warState = props.warState;
        const supplyline = this.warState.supplylines.get(props.id);
        this.posx1 = supplyline?.posx1 || 0;
        this.posy1 = supplyline?.posy1 || 0;
        this.posx2 = supplyline?.posx2 || 0;
        this.posy2 = supplyline?.posy2 || 0;
    }

    statusCallback = (data: string) => {
        this.setState(state => ({ ...state, supplylinestatusId: data }));
        this.warState.once(`supplylinestatusdelete${data}`, () => {
            this.setState(state => ({ ...state, supplylinestatusId: undefined }));
        });
    };

    battleDeleteCallback = () => {
        this.setState(state => ({ ...state, battleId: undefined }));
    }

    battleCallback = (data: string) => {
        this.setState(state => ({ ...state, battleId: data }));
        this.warState.removeListener(`battledelete${data}`, this.battleDeleteCallback);
        this.warState.once(`battledelete${data}`, this.battleDeleteCallback);
    };

    componentDidMount(): void {
        this.warState.on(`supplyline${this.props.id}`, this.statusCallback);
        this.warState.on(`battlesetmapEntityId${this.props.id}`, this.battleCallback);
    }

    componentWillUnmount(): void {
        this.warState.removeListener(`supplyline${this.props.id}`, this.statusCallback);
        this.warState.removeListener(`battlesetmapEntityId${this.props.id}`, this.battleCallback);
    }

    render() {
        let color = "#888";
        if (this.state.supplylinestatusId) {
            const status = this.warState.supplylinestatusMap.get(this.state.supplylinestatusId);
            if (status) color = this.warState.lookupFactions.get(status.factionid)?.color;
        }

        const battle = this.warState.GetBattle(this.state.battleId);

        return <>
            <Line
                points={[
                    this.posx1,
                    this.posy1,
                    this.posx2,
                    this.posy2
                ]}
                stroke={color}
                strokeWidth={8}
            />
            {battle ? <Circle
                key={battle.id}
                x={this.posx1 + (this.posx2 - this.posx1) * Number(battle.position)}
                y={this.posy1 + (this.posy2 - this.posy1) * Number(battle.position)}
                radius={10}
                fill={battleIdToColor(this.warState, this.state.battleId, BattleType.Skirmish)}
            /> : null}
        </>;
    }
}
