import { PaymentEntry } from "../fetcher/bunq.types.d.ts"

export interface IDataStore {
    SaveEntry: (payment: PaymentEntry) => Promise<void>
    GetAllEntries: () => Promise<PaymentEntry[]>
    HasContent: () => Promise<boolean>
}

export class NoDataInDataStoreError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "NoDataInDataStoreError";
        Object.setPrototypeOf(this, NoDataInDataStoreError.prototype);
    }
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
            throw new NoDataInDataStoreError("");
        }
        return this.m_entries;
    }

    public HasContent = async () => {
        if(!this.m_entries){
            return false;
        }

        return this.m_entries.length > 0;
    }

    private m_entries: PaymentEntry[] | undefined;
}
