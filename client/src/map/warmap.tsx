import image from "hagcp-assets/images/background.png";
// @ts-expect-error
import { MapInteractionCSS } from "react-map-interaction";
import React, { useState } from "react";
import { WarState } from "../warmapEventHandler";
import MapSector from "./mapSector";
import sectorsToDraw from "../json/sectors.json";
import Settings from "../settings";

const sectorsToDrawSet = new Set(sectorsToDraw);

const totalWidth = 16384;
const totalHeight = 11520;

const numberOfChunks = 16;
const baseWidth = totalWidth / numberOfChunks;
const baseHeight = totalHeight / numberOfChunks;
const width = baseWidth * numberOfChunks;
const height = baseHeight * numberOfChunks;

const posStyling: React.CSSProperties = {
    position: "absolute",
    top: "0",
    left: "0",
};

const componentStyling: React.CSSProperties = {
    ...posStyling,
    width: "100%",
    height: "100%",
    zIndex: "-1",
};

const mapStyles: React.CSSProperties = {
    ...posStyling,
    width: `${width}px`,
    height: `${height}px`
};

const Warmap = ({
    warState
}: {
    warState: WarState;
}): JSX.Element => {
    const [warid, setWarid] = useState("");

    warState.WarmapChangeCallback = setWarid;

    const sectors = [];
    for (let x = 0; x < numberOfChunks; x++) {
        for (let y = 0; y < numberOfChunks; y++) {
            const index = (y * numberOfChunks) + x;
            if (sectorsToDrawSet.has(index)) {
                sectors.push(<MapSector
                    posx={baseWidth}
                    posy={baseHeight}
                    offsetx={baseWidth * x}
                    offsety={baseHeight * y}
                    index={index}
                    warState={warState}
                    key={index}
                />);
            }
        }
    }

    return <div style={componentStyling}>
        <MapInteractionCSS minScale={0.10}
            defaultValue={{
                scale: 0.10,
                translation: { x: 0, y: 0, },
            }}>
            <img id={warid} src={image} style={mapStyles} alt="background map" />
            {sectors}
        </MapInteractionCSS>
        <Settings warState={warState} />
    </div>;
};

export default Warmap;
