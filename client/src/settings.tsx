import React, { useEffect, useState } from "react";
import { WarState } from "./warmapEventHandler";

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
    warState
}: {
    warState: WarState;
}): JSX.Element => {
    const [disabled, setDisabled] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    const onChange = (e: { target: { value: string; }; }) => {
        const value = e.target.value;
        if (value === "Select a faction") return;
        warState.currentFaction = value;
        console.log(e.target.value);
        setDisabled(true);
    };

    useEffect(() => {
        warState.OnlineCallback = (statusMsg: string) => {
            setStatus(statusMsg);
        };
    }, [warState]);

    return <div style={componentStyling}>
        <h1>HGWarmap</h1>
        <h2>Settings</h2>
        <select name="select" onChange={onChange} disabled={disabled}>
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
        {status ? <h3>{status}</h3> : null}
    </div >;
};

export default Settings;
