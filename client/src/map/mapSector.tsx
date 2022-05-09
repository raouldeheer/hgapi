import BattlefieldPoint from "./battlefieldPoint";
import { Stage, Layer } from "react-konva";
import Supplyline from "./supplyline";
import { WarmapEventHandler } from "../warmapEventHandler";
import { useEffect, useState } from "react";

const MapSector = ({
    posx,
    posy,
    offsetx,
    offsety,
    index,
    warmapEventHandler,
}: {
    posx: number;
    posy: number;
    offsetx: number;
    offsety: number;
    index: number;
    warmapEventHandler: WarmapEventHandler;
}): JSX.Element => {
    const [mapPoints, setMapPoints] = useState({ bfsSector: [], supsSector: [] });

    useEffect(() => {
        (async () => {
            try {
                const data = await fetch(`/assets/sectors/${index}.json`).then(value => value.json())
                setMapPoints(data);
            } catch (error) {
                console.error(error);
            }
        })();
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
            {mapPoints.supsSector.map(element => <Supplyline
                key={element}
                supplylineId={element}
                warmapEventHandler={warmapEventHandler}
            />)}
            {mapPoints.bfsSector.map(element => <BattlefieldPoint
                key={element}
                battlefieldId={element}
                warmapEventHandler={warmapEventHandler}
            />)}
        </Layer>
    </Stage>;
};
export default MapSector;

