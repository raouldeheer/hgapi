import { DijkstraCalculator } from 'dijkstra-calculator';
import { DataStore } from "hagcp-utils";
import { Request, Response } from "express";
import { MapPoint } from '../interfaces';
import { getResolveTitle } from './battlefieldNaming';

export function shortestRoute(datastore: DataStore) {
    const resolveTitle = getResolveTitle(datastore);

    const graph = new DijkstraCalculator;

    // Add battlefields
    datastore.GetItemStore("battlefield")?.forEach(({ id }) => {
        graph.addVertex(id);
    });

    // Add supplylines
    datastore.GetItemStore("supplyline")?.forEach(({ accesspoint1Id, accesspoint2Id }) => {
        const bf1 = datastore.GetData("accesspoint", accesspoint1Id).battlefield;
        const bf2 = datastore.GetData("accesspoint", accesspoint2Id).battlefield;
        const { posx: posx1, posy: posy1 } = datastore.GetData("battlefield", bf1);
        const { posx: posx2, posy: posy2 } = datastore.GetData("battlefield", bf2);
        graph.addEdge(bf1, bf2, Math.hypot(posx2 - posx1, posy2 - posy1));
    });

    const getResult = (from: string, to: string) => ({
        path: graph.calculateShortestPath(from, to),
        distance: graph.calculateShortestPathAsLinkedListResult(from, to)
            .map(value => graph.adjacencyList[value.source]
                .find(item => item.id === value.target)?.weight || 0)
            .reduce((prev, curr) => prev + curr, 0),
    });

    return (req: Request, res: Response) => {
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
    };
}