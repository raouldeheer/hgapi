import image from "hagcp-assets/images/background.webp";
// @ts-expect-error
import { MapInteractionCSS } from "react-map-interaction";
import React, { useState } from "react";
import { Stage, Layer } from "react-konva";
import BattlefieldPoint from "./battlefieldPoint";
import Supplyline from "./supplyline";
import { WarState } from "../warmapEventHandler";
import sectorsToDraw from "../json/sectors.json";
import Settings from "../settings";

const totalWidth = 16384;
const totalHeight = 11520;

const numberOfChunks = 16;
const baseWidth = totalWidth / numberOfChunks;
const baseHeight = totalHeight / numberOfChunks;

const posStyling: React.CSSProperties = {
    position: "absolute",
    top: "0",
    left: "0",
};

const componentStyling: React.CSSProperties = {
    ...posStyling,
    width: "100%",
    height: "100%",
};

const mapStyles: React.CSSProperties = {
    ...posStyling,
    width: `${baseWidth * numberOfChunks}px`,
    height: `${baseHeight * numberOfChunks}px`
};

const Warmap = ({ warState }: { warState: WarState; }): JSX.Element => {
    const [warid, setWarid] = useState("");
    warState.onNewWar = setWarid;

    const sectors = [];
    for (let x = 0; x < numberOfChunks; x++) {
        for (let y = 0; y < numberOfChunks; y++) {
            const sectorInList = sectorsToDraw.findIndex(v => v.index === ((y * numberOfChunks) + x));
            if (sectorInList !== -1) {
                const sectorData = sectorsToDraw[sectorInList];
                sectors.push(<Stage
                    style={{
                        position: "absolute",
                        top: `${baseHeight * y}px`,
                        left: `${baseWidth * x}px`,
                        width: `${baseWidth}px`,
                        height: `${baseHeight}px`
                    }}
                    key={`sector${sectorData.index}`}
                    width={baseWidth}
                    height={baseHeight}
                    offsetX={baseWidth * x}
                    offsetY={baseHeight * y}
                    listening={false}>
                    <Layer listening={false}>
                        {sectorData.supsSector.map(e => <Supplyline key={e} id={e} warState={warState} />)}
                        {sectorData.bfsSector.map(e => <BattlefieldPoint key={e} id={e} warState={warState} />)}
                    </Layer>
                </Stage>);
            }
        }
    }

    return <div style={componentStyling}>
        <MapInteractionCSS minScale={0.10} defaultValue={{ scale: 0.10, translation: { x: 0, y: 0, }, }}>
            <img id={warid} src={image} style={mapStyles} alt="background map" />
            {sectors}
        </MapInteractionCSS>
        <Settings warState={warState} />
    </div>;
};

export default Warmap;
