interface IFetcher {
    FetchData: () => Promise<void>;
    IsReady: () => Promise<boolean>;
    //GetDatabaseAcces: () => Promise<DB>;
}

class Fetcher implements IFetcher {
    public FetchData = async () => {

    }

    public IsReady = async () :Promise<boolean> => {
        return true;
    }

    // state:
    private m_pubKey: string = "";
    private m_privKey: string = "";
    private m_ready: boolean = false;
}
