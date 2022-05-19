import { Express } from "express";
import { DijkstraCalculator } from "dijkstra-calculator";
import { Request, Response } from "express";
import { APIConfig, Battlefield } from "../interfaces";

export function shortestRoute(app: Express, config: APIConfig) {
    const {
        expressDatastore: datastore,
        resolveTitle,
    } = config;

    const mapGraph = new DijkstraCalculator;

    // Add battlefields
    datastore.GetItemStore("battlefield")?.forEach(({ id }) => {
        mapGraph.addVertex(id);
    });

    // Add supplylines
    datastore.GetItemStore("supplyline")?.forEach(({ accesspoint1Id, accesspoint2Id }) => {
        const bf1 = datastore.GetData("accesspoint", accesspoint1Id).battlefield;
        const bf2 = datastore.GetData("accesspoint", accesspoint2Id).battlefield;
        const { posx: posx1, posy: posy1 } = datastore.GetData("battlefield", bf1);
        const { posx: posx2, posy: posy2 } = datastore.GetData("battlefield", bf2);
        mapGraph.addEdge(bf1, bf2, Math.hypot(posx2 - posx1, posy2 - posy1));
    });

    const getResult = (from: string, to: string) => ({
        path: mapGraph.calculateShortestPath(from, to),
        distance: mapGraph.calculateShortestPathAsLinkedListResult(from, to)
            .map(value => mapGraph.adjacencyList[value.source]
                .find(item => item.id === value.target)?.weight || 0)
            .reduce((prev, curr) => prev + curr, 0),
    });

    app.get("/battlefieldroute", (req: Request, res: Response) => {
        res.set("Cache-control", "public, max-age=300");
        if (req.query.id1 && req.query.id2) {
            const id1 = String(req.query.id1);
            const id2 = String(req.query.id2);
            if (/^\d+$/.test(id1) && /^\d+$/.test(id2)) {
                res.json(getResult(id1, id2));
                return;
            }
        } else if (req.query.bftitle1, req.query.bftitle2) {
            try {
                const id1 = resolveTitle(String(req.query.bftitle1)).id;
                const id2 = resolveTitle(String(req.query.bftitle2)).id;
                res.json(getResult(id1, id2));
            } catch (error) {
                if (typeof error == "number") res.sendStatus(error);
            }
            return;
        }
        res.sendStatus(412);
    });

    const battlefields = datastore.GetItemStore<Battlefield>("battlefield") || [];
    const airfields = new Map(Array.from(battlefields.values())
        .filter(element => element.gamemap === "204" || element.gamemap === "205")
        .map(e => ([e.id, e])));
    const distances = new Map([3450, 3600, 3800, 2850, 1850].map(distance => {
        const planeGraph = new DijkstraCalculator;

        // Add airfields
        airfields.forEach(element => {
            planeGraph.addVertex(element.id);
        });

        // Add routes
        for (const [key1, bf1] of airfields) {
            for (const [key2, bf2] of airfields) {
                if (key1 === key2) continue;
                const distanceBetween = Math.hypot(bf2.posx - bf1.posx, bf2.posy - bf1.posy);
                if (distanceBetween < (distance / 4)) planeGraph.addEdge(key1, key2, distanceBetween);
            }
        }

        return [distance, planeGraph];
    }));

    app.get("/planeroute", (req: Request, res: Response) => {
        res.set("Cache-control", "public, max-age=300");
        if (req.query.distance) {
            const distance = Number(req.query.distance);
            const planeGraph = distances.get(distance);
            if (planeGraph) {
                const getPlaneResult = (from: string, to: string) => ({
                    path: planeGraph.calculateShortestPath(from, to),
                    distance: planeGraph.calculateShortestPathAsLinkedListResult(from, to)
                        .map(value => planeGraph.adjacencyList[value.source]
                            .find(item => item.id === value.target)?.weight || 0)
                        .reduce((prev, curr) => prev + curr, 0),
                });

                if (req.query.id1 && req.query.id2) {
                    const id1 = String(req.query.id1);
                    const id2 = String(req.query.id2);
                    if (/^\d+$/.test(id1) && /^\d+$/.test(id2) && airfields.has(id1) && airfields.has(id2)) {
                        res.json(getPlaneResult(id1, id2));
                        return;
                    }
                } else if (req.query.bftitle1, req.query.bftitle2) {
                    try {
                        const id1 = resolveTitle(String(req.query.bftitle1)).id;
                        const id2 = resolveTitle(String(req.query.bftitle2)).id;
                        if (airfields.has(id1) && airfields.has(id2)) {
                            res.json(getPlaneResult(id1, id2));
                        } else {
                            res.sendStatus(412);
                        }
                    } catch (error) {
                        if (typeof error == "number") res.sendStatus(error);
                    }
                    return;
                }
            }
        }
        res.sendStatus(412);
    });
}
