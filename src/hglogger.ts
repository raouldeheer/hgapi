import { appendFile } from "fs/promises";
import { existsSync, mkdirSync } from "fs";

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
    const date = (new Date).toISOString();
    queue.push(`${date}\t${key}\t${JSON.stringify(data)}\n`);
}
