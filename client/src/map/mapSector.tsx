import BattlefieldPoint from "./battlefieldPoint";
import { Stage, Layer } from "react-konva";
import Supplyline from "./supplyline";
import { WarState } from "../warmapEventHandler";

const MapSector = ({
    posx,
    posy,
    offsetx,
    offsety,
    sectorData,
    warState,
}: {
    posx: number;
    posy: number;
    offsetx: number;
    offsety: number;
    sectorData: {index: number, bfsSector: string[], supsSector: string[] }
    warState: WarState;
}): JSX.Element => {    
    return <Stage
        style={{
            position: "absolute",
            top: `${offsety}px`,
            left: `${offsetx}px`,
            width: `${posx}px`,
            height: `${posy}px`
        }}
        key={`sector${sectorData.index}`}
        width={posx}
        height={posy}
        offsetX={offsetx}
        offsetY={offsety}
        listening={false}
    >
        <Layer listening={false}>
            {sectorData.supsSector.map(e => <Supplyline key={e} id={e} warState={warState} />)}
            {sectorData.bfsSector.map(e => <BattlefieldPoint key={e} id={e} warState={warState} />)}
        </Layer>
    </Stage>;
};
export default MapSector;

