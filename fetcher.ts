import { log } from "./utility/logger.ts";
import { IKeyManager } from "./key_manager.ts";
import { BunqConnector } from "./bunq_connector.ts";

interface IFetcher {
    FetchData: () => Promise<void>;
}

/*
    Fetcher is a class responsible for fetching and updating data
    Method should be injected that will save data in a way
    wanted by the consumer of the fetch
*/

export class Fetcher implements IFetcher {
    constructor(bunqConnector: BunqConnector){
        this.m_bunqConnector = bunqConnector;
    }

    public FetchData = async () => {
        if(this.m_bunqConnector.ConnectionEstablished()){
           return;
        }
    }




    // state:
    private m_bunqConnector: BunqConnector;
}
