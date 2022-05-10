import { KeyValueChangeKey } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import { MapPoint, Battlefield, Accesspoint, AccesspointTemplate, Supplyline } from "../interfaces";

export const getResolveTitle = (datastore: DataStore) => (bftitle: string): MapPoint => {
    if (bftitle.includes(" - ")) {
        const battlefield = Array.from(datastore.GetItemStore<Battlefield>(KeyValueChangeKey.battlefield)?.values() || [])
            .find(value => value.bftitle === bftitle.split(" - ")[0]);
        if (!battlefield) throw 404;

        const accesspoint = Array.from(datastore.GetItemStore<Accesspoint>(KeyValueChangeKey.accesspoint)?.values() || [])
            .find(value => {
                if (value.battlefield === battlefield.id) {
                    const template = datastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, value.template);
                    return bftitle === `${battlefield.bftitle} - ${template.abbr}`;
                }
                return false;
            });
        if (!accesspoint) throw 404;

        const supplyline = Array.from(datastore.GetItemStore<Supplyline>(KeyValueChangeKey.supplyline)?.values() || [])
            .find(value => (value.accesspoint1Id === accesspoint.id) || (value.accesspoint2Id === accesspoint.id));
        if (!supplyline) throw 404;
        return supplyline;
    } else {
        const battlefield = Array.from(datastore.GetItemStore<Battlefield>(KeyValueChangeKey.battlefield)?.values() || [])
            .find(value => value.bftitle === bftitle);
        if (!battlefield) throw 404;
        return battlefield;
    }
};

export const getToBFTitle = (datastore: DataStore) => (id: string) => {
    const result = datastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id)?.bftitle;
    if (result) return result;
    const supplyline = datastore.GetData<Supplyline>(KeyValueChangeKey.supplyline, id);
    if (!supplyline) throw 404;
    const ap1 = datastore.GetData<Accesspoint>(KeyValueChangeKey.accesspoint, supplyline.accesspoint1Id);
    if (!ap1) throw 404;
    const ap2 = datastore.GetData<Accesspoint>(KeyValueChangeKey.accesspoint, supplyline.accesspoint2Id);
    if (!ap2) throw 404;
    const apt1 = datastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, ap1.template);
    if (!apt1) throw 404;
    const apt2 = datastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, ap2.template);
    if (!apt2) throw 404;
    const apb1 = datastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, ap1.battlefield);
    if (!apb1) throw 404;
    const apb2 = datastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, ap2.battlefield);
    if (!apb2) throw 404;
    return `${apb1.bftitle} - ${apt1.abbr} or ${apb2.bftitle} - ${apt2.abbr}`;
};
