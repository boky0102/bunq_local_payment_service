import { PaymentEntry } from "../fetcher/bunq.types.d.ts"

export interface IDataStore {
    SaveEntry: (payment: PaymentEntry) => Promise<void>
    GetAllEntries: () => Promise<[PaymentEntry]>
    HasContent: () => Promise<boolean>
}

export class InMemoryStoreObject implements IDataStore {

    SaveEntry = async (payment: PaymentEntry) => {
        if(!this.m_entries){
            this.m_entries = [payment];
        }

        this.m_entries.push(payment);
    }

    GetAllEntries = async () => {
        if(!this.m_entries){
            throw new Error("There are no entries in the data store");
        }
        return this.m_entries;
    }

    public HasContent = async () => {
        if(!this.m_entries){
            return false;
        }

        return this.m_entries.length > 0;
    }

    private m_entries: [PaymentEntry] | undefined;
}
