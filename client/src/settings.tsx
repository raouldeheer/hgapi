import React from "react";
import { WarmapEventHandler } from "./warmapEventHandler";

const posStyling: React.CSSProperties = {
    position: "absolute",
    top: "0",
    left: "0",
};

const componentStyling: React.CSSProperties = {
    ...posStyling,
    padding: "15px",
    borderBottomRightRadius: "10px",
    backgroundColor: "#777",
};

const Settings = ({
    warmapEventHandler
}: {
    warmapEventHandler: WarmapEventHandler;
}): JSX.Element => {
    const onChange = (e: { target: { value: string; }; }) => {
        const value = e.target.value;
        if (value === "Select a faction") return;
        warmapEventHandler.currentFaction = value;
        console.log(e.target.value);
    };

    return <div style={componentStyling}>
        <h1>HGWarmap</h1>
        <h2>Settings</h2>
        <select name="select" onChange={onChange}>
            <option>Select a faction</option>
            <option key={3}>SU</option>
            <option key={2}>GE</option>
            <option key={1}>US</option>
        </select>
        <h2>Colors</h2>
        <ul style={{ margin: 0 }}>
            <li style={{ margin: 0, color: "White" }}>Normal battle</li>
            <li style={{ margin: 0, color: "Aqua" }}>Battle not fun</li>
            <li style={{ margin: 0, color: "Yellow" }}>Battle queued</li>
            <li style={{ margin: 0, color: "Orange" }}>Battle running</li>
            <li style={{ margin: 0, color: "DarkRed" }}>Battle ending</li>
        </ul>
    </div >;
};

export default Settings;
