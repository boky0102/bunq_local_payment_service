import { log } from "../utility/logger.ts";
import { IBunqConnector } from "./bunq_connector.ts";
import { IDataStore } from "../datastore/datastore.ts";

interface IFetcher {
    FetchData: () => Promise<void>;
}

/*
    Fetcher is a class responsible for fetching and updating data
    Method should be injected that will save data in a way
    wanted by the consumer of the fetch
*/

export class Fetcher implements IFetcher {
    constructor(bunqConnector: IBunqConnector, dataStore: IDataStore){
        this.m_bunqConnector = bunqConnector;
        this.m_dataStore = dataStore;
    }

    public FetchData = async () => {
        log.info("Fetcher trying to establish connection with BunqConnector");
        await this.m_bunqConnector.EstablishConnection();

        log.info("Fetcher trying to fetch data");
        const data = await this.m_bunqConnector.GetPayments();
        log.success("Fetcher successfully fetched data");

        if(!data){
            throw new Error("No data received from BunqConnector");
        }

        log.info("Trying to save data to datastore");
        data.forEach( async (entry) => {
            await this.m_dataStore.SaveEntry(entry);
        });
        log.success("Data saved successfully");
    }

    // state:
    private m_bunqConnector: IBunqConnector;
    private m_dataStore: IDataStore;
}
