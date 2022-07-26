import { Application, Request } from "express";

export type EndpointHandler = <T>(route: string, cacheHeader: string, handler: (req: Request) => T | Promise<T>) => void;
export function getEndpointFunc(app: Application): EndpointHandler {
    return <T>(route: string, cacheHeader: string, handler: (req: Request) => T | Promise<T>) => {
        app.get(route, async (req, res) => {
            res.set("Cache-control", cacheHeader);
            try {
                const result = await handler(req);
                res.json(result);
            } catch (error) {
                if (typeof error === "number") res.sendStatus(error);
                else throw error;
            }
            return;
        });
    };
}

export const notFound = () => { throw 404; };

export function checkService<T>(
    client: T
): asserts client is NonNullable<T> {
    if (client === null || client === undefined) {
        throw 503;
    }
}
