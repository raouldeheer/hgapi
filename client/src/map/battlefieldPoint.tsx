import { Component } from "react";
import { Circle, Text, Path, Star } from "react-konva";
import { WarState } from "../warmapEventHandler";
import { battleIdToColor, BattleType } from "./battleUtils";
import { Battlefield } from "./mapInterfaces";

interface BattlefieldProps {
    id: string;
    warState: WarState;
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
    warState: WarState;
    readonly pointSize = 15;

    constructor(props: BattlefieldProps) {
        super(props);
        this.warState = props.warState;
    }

    statusCallback = (data: string) => {
        this.setState({ battlefieldstatusId: data });
    };

    battleDeleteCallback = () => {
        this.setState({ battleId: undefined });
    };

    battleCallback = (data: string) => {
        this.setState({ battleId: data });
        this.warState.removeListener(`battledelete${data}`, this.battleDeleteCallback);
        this.warState.once(`battledelete${data}`, this.battleDeleteCallback);
    };

    componentDidMount(): void {
        this.warState.on(`battlefield${this.props.id}`, this.statusCallback);
        this.warState.on(`battlesetmapEntityId${this.props.id}`, this.battleCallback);
        this.warState.once("loaded", () => {
            this.forceUpdate();
        });
    }

    componentWillUnmount(): void {
        this.warState.removeListener(`battlefield${this.props.id}`, this.statusCallback);
        this.warState.removeListener(`battlesetmapEntityId${this.props.id}`, this.battleCallback);
    }

    render() {
        const battlefield: Battlefield = this.warState.battlefields.get(this.props.id);
        const posx = battlefield?.posx || 0;
        const posy = battlefield?.posy || 0;
        const bftitle = battlefield?.bftitle || "";
        const gamemap = battlefield?.gamemap || "";

        if (this.state.battleId && !this.warState.activeBattles.has(this.state.battleId))
            this.battleDeleteCallback();

        let color = "#888";
        if (this.state.battlefieldstatusId) {
            const status = this.warState.battlefieldstatusMap.get(this.state.battlefieldstatusId);
            if (status) color = this.warState.lookupFactions.get(status.factionid)?.color;
        }

        let specialIcon = null;
        if (gamemap === "204" || gamemap === "205") {
            specialIcon = <Path
                x={posx - (this.pointSize / 3)}
                y={posy - (this.pointSize / 3)}
                fill={"Black"}
                scale={{ x: 0.02, y: 0.02 }}
                data="M482.3 192C516.5 192 576 221 576 256C576 292 516.5 320 482.3 320H365.7L265.2 495.9C259.5 505.8 248.9 512 237.4 512H181.2C170.6 512 162.9 501.8 165.8 491.6L214.9 320H112L68.8 377.6C65.78 381.6 61.04 384 56 384H14.03C6.284 384 0 377.7 0 369.1C0 368.7 .1818 367.4 .5398 366.1L32 256L.5398 145.9C.1818 144.6 0 143.3 0 142C0 134.3 6.284 128 14.03 128H56C61.04 128 65.78 130.4 68.8 134.4L112 192H214.9L165.8 20.4C162.9 10.17 170.6 0 181.2 0H237.4C248.9 0 259.5 6.153 265.2 16.12L365.7 192H482.3z"
            />;
        } else if (this.props.warState.capitals.has(this.props.id)) {
            specialIcon = <Star
                numPoints={5}
                innerRadius={this.pointSize / 3}
                outerRadius={(this.pointSize / 3) * 2}
                x={posx}
                y={posy}
                fill={"Black"}
            />;
        }

        return <>
            <Circle
                x={posx}
                y={posy}
                radius={this.pointSize}
                fill={battleIdToColor(this.warState, this.state.battleId, BattleType.Assault, color)}
            />
            {specialIcon}
            <Text text={bftitle} x={posx} y={posy + this.pointSize} />
        </>;
    }
}
