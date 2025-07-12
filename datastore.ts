import { PaymentEntry } from "./bunq.types.d.ts"

export interface IDataStore {
    SaveEntry: (payment: PaymentEntry) => Promise<void>
    GetAllEntries: () => Promise<[PaymentEntry]>
}

export class InMemoryStoreObject implements IDataStore {

    SaveEntry = async (payment: PaymentEntry) => {
       console.log(payment);
    }

    GetAllEntries = async () => {
        if(!this.m_entries){
            throw new Error("There are no entries in the data store");
        }
        return this.m_entries;
    }

    private m_entries: [PaymentEntry] | undefined;
}
