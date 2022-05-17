import { KeyValueChangeKey } from "hagcp-network-client";
import { DataStore } from "hagcp-utils";
import { MapPoint, Battlefield, Accesspoint, AccesspointTemplate, Supplyline } from "../interfaces";

const notFound = () => { throw 404; };
const getItemStoreArray = <T>(datastore: DataStore, name: KeyValueChangeKey) =>
    Array.from<T>(datastore.GetItemStore<T>(name)?.values() || []);

export const getResolveTitle = (datastore: DataStore) => (bftitle: string): MapPoint => {
    if (bftitle.includes(" - ")) {
        const battlefield = getItemStoreArray<Battlefield>(datastore, KeyValueChangeKey.battlefield)
            .find(value => value.bftitle === bftitle.split(" - ")[0]) || notFound();

        const accesspoint = getItemStoreArray<Accesspoint>(datastore, KeyValueChangeKey.accesspoint)
            .find(value => value.battlefield === battlefield.id
                ? bftitle === `${battlefield.bftitle} - ${datastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, value.template).abbr}`
                : false
            ) || notFound();

        const supplyline = getItemStoreArray<Supplyline>(datastore, KeyValueChangeKey.supplyline)
            .find(value => (value.accesspoint1Id === accesspoint.id) || (value.accesspoint2Id === accesspoint.id)) || notFound();
        return supplyline;
    } else {
        const battlefield = getItemStoreArray<Battlefield>(datastore, KeyValueChangeKey.battlefield)
            .find(value => value.bftitle === bftitle) || notFound();
        return battlefield;
    }
};

export const getToBFTitle = (datastore: DataStore) => (id: string): string => {
    const result = datastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, id)?.bftitle;
    if (result) return result;
    const supplyline = datastore.GetData<Supplyline>(KeyValueChangeKey.supplyline, id) || notFound();
    const ap1 = datastore.GetData<Accesspoint>(KeyValueChangeKey.accesspoint, supplyline.accesspoint1Id) || notFound();
    const ap2 = datastore.GetData<Accesspoint>(KeyValueChangeKey.accesspoint, supplyline.accesspoint2Id) || notFound();
    const apt1 = datastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, ap1.template) || notFound();
    const apt2 = datastore.GetData<AccesspointTemplate>(KeyValueChangeKey.accesspointtemplate, ap2.template) || notFound();
    const apb1 = datastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, ap1.battlefield) || notFound();
    const apb2 = datastore.GetData<Battlefield>(KeyValueChangeKey.battlefield, ap2.battlefield) || notFound();
    return `${apb1.bftitle} - ${apt1.abbr} or ${apb2.bftitle} - ${apt2.abbr}`;
};
