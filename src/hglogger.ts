import { appendFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import { PacketClass } from "hagcp-network-client";

let queue: string[] = [];
if (!existsSync("./hglogs")) mkdirSync("./hglogs");
setInterval(async () => {
    const data = queue.join("");
    queue = [];
    if (data) await appendFile(
        `./hglogs/${(new Date).toISOString().split("T")[0]}.log`,
        data,
        "utf8"
    );
}, 5000);

export function hglog(key: string, data: unknown) {
    if (key === PacketClass.GetMissionDetailsRequest.name) return;
    const date = (new Date).toISOString();
    queue.push(`${date}\t${key}\t${JSON.stringify(data)}\n`);
}

export function hglogMissionDetails(key: string, data: unknown, time: string) {
    const date = (new Date).toISOString();
    queue.push(`${date}\t${time}\t${key}\t${JSON.stringify(data)}\n`);
}
