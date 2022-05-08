import { Component } from "react";
import { Circle, Text, Path, Star } from "react-konva";
import { WarmapEventHandler } from "../warmapEventHandler";
import { battleIdToColor } from "./battleUtils";

interface BattlefieldProps {
    battlefieldId: string;
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
    posx: number;
    posy: number;
    bftitle: string;
    gamemap: string;
    warmapEventHandler: WarmapEventHandler;
    readonly pointSize = 15;

    constructor(props: BattlefieldProps) {
        super(props);
        this.warmapEventHandler = props.warmapEventHandler;
        const battlefield = this.warmapEventHandler.battlefields.get(props.battlefieldId);
        this.posx = battlefield?.posx || 0;
        this.posy = battlefield?.posy || 0;
        this.bftitle = battlefield?.bftitle || "";
        this.gamemap = battlefield?.gamemap || "";
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
        this.warmapEventHandler.on(`battlefield${this.props.battlefieldId}`, this.statusCallback);
        this.warmapEventHandler.on(`battlesetmapEntityId${this.props.battlefieldId}`, this.battleCallback);
    }

    componentWillUnmount(): void {
        this.warmapEventHandler.removeListener(`battlefield${this.props.battlefieldId}`, this.statusCallback);
        this.warmapEventHandler.removeListener(`battlesetmapEntityId${this.props.battlefieldId}`, this.battleCallback);
    }

    render() {
        let color = "#888";
        if (this.state.battlefieldstatusId) {
            const status = this.warmapEventHandler.battlefieldstatusMap.get(this.state.battlefieldstatusId);
            if (status) color = this.warmapEventHandler.lookupFactions.get(status.factionid)?.color;
        }

        let specialIcon = null;
        if (this.gamemap === "204" || this.gamemap === "205") {
            specialIcon = <Path
                x={this.posx - (this.pointSize / 3)}
                y={this.posy - (this.pointSize / 3)}
                fill={"Black"}
                scale={{ x: 0.02, y: 0.02 }}
                data="M482.3 192C516.5 192 576 221 576 256C576 292 516.5 320 482.3 320H365.7L265.2 495.9C259.5 505.8 248.9 512 237.4 512H181.2C170.6 512 162.9 501.8 165.8 491.6L214.9 320H112L68.8 377.6C65.78 381.6 61.04 384 56 384H14.03C6.284 384 0 377.7 0 369.1C0 368.7 .1818 367.4 .5398 366.1L32 256L.5398 145.9C.1818 144.6 0 143.3 0 142C0 134.3 6.284 128 14.03 128H56C61.04 128 65.78 130.4 68.8 134.4L112 192H214.9L165.8 20.4C162.9 10.17 170.6 0 181.2 0H237.4C248.9 0 259.5 6.153 265.2 16.12L365.7 192H482.3z"
            />;
        } else if (this.props.warmapEventHandler.capitals.has(this.props.battlefieldId)) {
            specialIcon = <Star
                numPoints={5}
                innerRadius={this.pointSize / 3}
                outerRadius={(this.pointSize / 3) * 2}
                x={this.posx}
                y={this.posy}
                fill={"Black"}
            />;
        }

        return <>
            <Circle
                x={this.posx}
                y={this.posy}
                radius={this.pointSize}
                fill={battleIdToColor(this.warmapEventHandler, this.state.battleId, "0", color)}
                listening={false}
                transformsEnabled={"position"}
                perfectDrawEnabled={false}
            />
            {specialIcon}
            <Text
                text={this.bftitle}
                x={this.posx}
                y={this.posy + this.pointSize}
                listening={false}
                transformsEnabled={"position"}
                perfectDrawEnabled={false}
            />
        </>;
    }
}
