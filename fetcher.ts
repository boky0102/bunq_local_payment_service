import { log } from "./utility/logger.ts";
import { IKeyManager } from "./key_manager.ts";

interface IFetcher {
    FetchData: () => Promise<void>;
    IsReady: () => Promise<boolean>;
    //GetDatabaseAcces: () => Promise<DB>;
}

export class Fetcher implements IFetcher {
    constructor(keyManager: IKeyManager){
        this.m_keyManager = keyManager;
    }

    public FetchData = async () => {
        const {publicKey, privateKey} = await this.m_keyManager.GetKeys();
    }

    public IsReady = async () :Promise<boolean> => {

        return true;
    }

    // state:
    private m_keyManager: IKeyManager;
    private m_pubKey: string = "";
    private m_privKey: string = "";
    private m_ready: boolean = false;
    // private m_latestTransactionDate: Date;
}
