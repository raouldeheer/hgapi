import { Component } from "react";
import { Circle, Line } from "react-konva";
import { WarmapEventHandler } from "../warmapEventHandler";
import { supplyline } from "./mapInterfaces";

interface SupplylineProps {
    supplyline: supplyline;
    warmapEventHandler: WarmapEventHandler;
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
    warmapEventHandler: WarmapEventHandler;

    constructor(props: SupplylineProps) {
        super(props);
        this.posx1 = props.supplyline.posx1;
        this.posy1 = props.supplyline.posy1;
        this.posx2 = props.supplyline.posx2;
        this.posy2 = props.supplyline.posy2;
        this.warmapEventHandler = props.warmapEventHandler;
    }

    statusCallback = (data: string) => {
        this.setState(state => ({ ...state, supplylinestatusId: data }));
        this.warmapEventHandler.once(`supplylinestatusdelete${data}`, () => {
            this.setState(state => ({ ...state, supplylinestatusId: undefined }));
        });
    };

    battleDeleteCallback = () => {
        this.setState(state => ({ ...state, battleId: undefined }));
    }

    battleCallback = (data: string) => {
        this.setState(state => ({ ...state, battleId: data }));
        this.warmapEventHandler.removeListener(`battledelete${data}`, this.battleDeleteCallback);
        this.warmapEventHandler.once(`battledelete${data}`, this.battleDeleteCallback);
    };

    componentDidMount(): void {
        this.warmapEventHandler.on(`supplyline${this.props.supplyline.id}`, this.statusCallback);
        this.warmapEventHandler.on(`battlesetmapEntityId${this.props.supplyline.id}`, this.battleCallback);
    }

    componentWillUnmount(): void {
        this.warmapEventHandler.removeListener(`supplyline${this.props.supplyline.id}`, this.statusCallback);
        this.warmapEventHandler.removeListener(`battlesetmapEntityId${this.props.supplyline.id}`, this.battleCallback);
    }

    render() {
        let color = "#888";
        if (this.state.supplylinestatusId) {
            const status = this.warmapEventHandler.supplylinestatusMap.get(this.state.supplylinestatusId);
            if (status) color = this.warmapEventHandler.lookupFactions.get(status.factionid)?.color;
        }

        const battle = this.warmapEventHandler.GetBattle(this.state.battleId);

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
                listening={false}
                transformsEnabled={"position"}
                perfectDrawEnabled={false}
            />
            {battle ? <Circle
                key={battle.id}
                x={this.posx1 + (this.posx2 - this.posx1) * Number(battle.position)}
                y={this.posy1 + (this.posy2 - this.posy1) * Number(battle.position)}
                radius={8}
                fill="orange"
            /> : null}
        </>;
    }
}
