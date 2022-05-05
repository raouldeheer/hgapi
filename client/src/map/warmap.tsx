import image from "hagcp-assets/images/background.png";
import MapInteractionCSS from "./MapInteraction";
import React from "react";
import battlefield from "../json/battlefield.json";
import supplyline from "../json/supplyline.json";
import { WarmapEventHandler } from "../warmapEventHandler";
import MapSector from "./mapSector";

const totalWidth = 16384;
const totalHeight = 11520;

const numberOfChunks = 16;
const totalChunks = numberOfChunks * numberOfChunks;
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

export const posToSector = (x: number, y: number) =>
    (Math.floor(y / baseHeight) * numberOfChunks) + Math.floor(x / baseWidth);


const bfsSectors: any[][] = [];
const supsSectors: any[][] = [];

function lineLine(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
    // calculate the distance to intersection point
    const uA = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));
    const uB = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1));

    // if uA and uB are between 0-1, lines are colliding
    return (uA >= 0 && uA <= 1 && uB >= 0 && uB <= 1);
}

/**
 * check if line and rect intersect
 * @param x1 line x1
 * @param y1 line y1
 * @param x2 line x2
 * @param y2 line y2
 * @param rx rect x
 * @param ry rect y
 * @param rw rect x size
 * @param rh rect y size
 */
const lineRect = (x1: number, y1: number, x2: number, y2: number, rx: number, ry: number, rw: number, rh: number) =>
    lineLine(x1, y1, x2, y2, rx, ry, rx, ry + rh) ||
    lineLine(x1, y1, x2, y2, rx + rw, ry, rx + rw, ry + rh) ||
    lineLine(x1, y1, x2, y2, rx, ry, rx + rw, ry) ||
    lineLine(x1, y1, x2, y2, rx, ry + rh, rx + rw, ry + rh);

function addToSector(sectors: any[][], index: number, element: any) {
    if (index > totalChunks) return;
    if (!sectors[index]) sectors[index] = [];
    sectors[index].push(element);
}

battlefield.forEach((element: any) => {
    const index = posToSector(element.posx, element.posy);
    addToSector(bfsSectors, index, element);
    const edgeY = element.posy % baseHeight;
    if (edgeY < 20) addToSector(bfsSectors, index - numberOfChunks, element);
    else if (edgeY > (baseHeight - 20)) addToSector(bfsSectors, index + numberOfChunks, element);
    const edgeX = element.posx % baseWidth;
    if (edgeX < 20) addToSector(bfsSectors, index - 1, element);
    else if (edgeX > (baseWidth - 20)) addToSector(bfsSectors, index + 1, element);
});

supplyline.forEach((element: any) => {
    const index = posToSector(element.posx1, element.posy1);
    addToSector(supsSectors, index, element);
    const index2 = posToSector(element.posx2, element.posy2);
    if (index !== index2) {
        for (let x = 0; x < numberOfChunks; x++) {
            for (let y = 0; y < numberOfChunks; y++) {
                const index = (y * numberOfChunks) + x;
                if (lineRect(
                    element.posx1, element.posy1, element.posx2, element.posy2,
                    baseWidth * x, baseHeight * y, baseWidth, baseHeight
                )) addToSector(supsSectors, index, element);
            }
        }
    }
});

const Warmap = ({
    warmapEventHandler
}: {
    warmapEventHandler: WarmapEventHandler;
}): JSX.Element => {
    const sectors = [];
    for (let x = 0; x < numberOfChunks; x++) {
        for (let y = 0; y < numberOfChunks; y++) {
            const index = (y * numberOfChunks) + x;
            if (bfsSectors[index] || supsSectors[index]) {
                sectors.push(<MapSector
                    bfsSectors={bfsSectors}
                    supsSectors={supsSectors}
                    posx={baseWidth}
                    posy={baseHeight}
                    offsetx={baseWidth * x}
                    offsety={baseHeight * y}
                    index={index}
                    warmapEventHandler={warmapEventHandler}
                    key={index}
                />);
            }
        }
    }

    const onChange = (e: { target: { value: string; }; }) => {
        const value = e.target.value;
        if (value === "Select a faction") return;
        warmapEventHandler.currentFaction = value;
        console.log(e.target.value);
    };

    return <div style={componentStyling}>
        <MapInteractionCSS minScale={0.10}
            defaultValue={{
                scale: 0.10,
                translation: { x: 0, y: 0, },
            }}>
            <img src={image} style={mapStyles} alt="background map" />
            {sectors}
        </MapInteractionCSS>
        <select name="select" onChange={onChange} style={posStyling}>
            <option>Select a faction</option>
            <option key={3}>SU</option>
            <option key={2}>GE</option>
            <option key={1}>US</option>
        </select>
    </div>;
};

export default Warmap;
