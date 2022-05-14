import BattlefieldPoint from "./battlefieldPoint";
import { Stage, Layer } from "react-konva";
import Supplyline from "./supplyline";
import { WarState } from "../warmapEventHandler";
import { useEffect, useState } from "react";

const MapSector = ({
    posx,
    posy,
    offsetx,
    offsety,
    index,
    warState,
}: {
    posx: number;
    posy: number;
    offsetx: number;
    offsety: number;
    index: number;
    warState: WarState;
}): JSX.Element => {
    const [mapPoints, setMapPoints] = useState({ bfsSector: [], supsSector: [] });

    useEffect(() => {
        try {
            fetch(`/assets/sectors/${index}.json`).then(v => v.json()).then(setMapPoints);
        } catch (err) { console.error(err); }
    }, [index]);

    return <Stage
        style={{
            position: "absolute",
            top: `${offsety}px`,
            left: `${offsetx}px`,
            width: `${posx}px`,
            height: `${posy}px`
        }}
        key={`sector${index}`}
        width={posx}
        height={posy}
        offsetX={offsetx}
        offsetY={offsety}
        listening={false}
    >
        <Layer listening={false}>
            {mapPoints.supsSector.map(e => <Supplyline key={e} id={e} warState={warState} />)}
            {mapPoints.bfsSector.map(e => <BattlefieldPoint key={e} id={e} warState={warState} />)}
        </Layer>
    </Stage>;
};
export default MapSector;

