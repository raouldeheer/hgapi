import { Component } from "react";
import { Circle, Text } from "react-konva";
import { WarmapEventHandler } from "../warmapEventHandler";
import { battleIdToColor } from "./battleUtils";
import { Battlefield } from "./mapInterfaces";

interface BattlefieldProps {
    battlefield: Battlefield;
    warmapEventHandler: WarmapEventHandler;
}

interface BattlefieldState {
    battleId: string | undefined;
    battlefieldstatusId: string | undefined;
}

export default class BattlefieldPoint extends Component<BattlefieldProps, BattlefieldState> {
    state: Readonly<BattlefieldState> = {
        battleId: undefined,
        battlefieldstatusId: undefined,
    };
    warmapEventHandler: WarmapEventHandler;
    readonly pointSize = 15;

    constructor(props: BattlefieldProps) {
        super(props);
        this.warmapEventHandler = props.warmapEventHandler;
    }

    statusCallback = (data: string) => {
        this.setState(state => ({ ...state, battlefieldstatusId: data }));
    };

    battleDeleteCallback = () => {
        this.setState(state => ({ ...state, battleId: undefined }));
    };

    battleCallback = (data: string) => {
        this.setState(state => ({ ...state, battleId: data }));
        this.warmapEventHandler.removeListener(`battledelete${data}`, this.battleDeleteCallback);
        this.warmapEventHandler.once(`battledelete${data}`, this.battleDeleteCallback);
    };

    componentDidMount(): void {
        this.warmapEventHandler.on(`battlefield${this.props.battlefield.id}`, this.statusCallback);
        this.warmapEventHandler.on(`battlesetmapEntityId${this.props.battlefield.id}`, this.battleCallback);
    }

    componentWillUnmount(): void {
        this.warmapEventHandler.removeListener(`battlefield${this.props.battlefield.id}`, this.statusCallback);
        this.warmapEventHandler.removeListener(`battlesetmapEntityId${this.props.battlefield.id}`, this.battleCallback);
    }

    render() {
        let color = "#888";
        if (this.state.battlefieldstatusId) {
            const status = this.warmapEventHandler.battlefieldstatusMap.get(this.state.battlefieldstatusId);
            if (status) color = this.warmapEventHandler.lookupFactions.get(status.factionid)?.color;
        }

        return <>
            <Circle
                x={this.props.battlefield.posx}
                y={this.props.battlefield.posy}
                radius={this.pointSize}
                fill={battleIdToColor(this.warmapEventHandler, this.state.battleId, "0", color)}
                listening={false}
                transformsEnabled={"position"}
                perfectDrawEnabled={false}
            />
            <Text
                text={this.props.battlefield.bftitle}
                x={this.props.battlefield.posx}
                y={this.props.battlefield.posy + this.pointSize}
                listening={false}
                transformsEnabled={"position"}
                perfectDrawEnabled={false}
            />
        </>;
    }
}
