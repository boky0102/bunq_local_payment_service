import { log } from "../utility/logger.ts";
import { BunqConnector } from "./bunq_connector.ts";
import { UserPerson, MonetaryAccountBank, MonetaryAccountData, Payment, PaymentEntry} from "./bunq.types.d.ts";
import { LoadEnvVariables } from "../utility/utility.ts";
import { IDataStore } from "../datastore/datastore.ts";

interface IFetcher {
    FetchData: () => Promise<PaymentEntry[]>;
}

/*
    Fetcher is a class responsible for fetching and updating data
    Method should be injected that will save data in a way
    wanted by the consumer of the fetch
*/

export class Fetcher implements IFetcher {
    constructor(bunqConnector: BunqConnector, dataStore: IDataStore){
        this.m_bunqConnector = bunqConnector;
        this.m_dataStore = dataStore;
    }

    public FetchData = async () => {
        const [userData, token] = await this.m_bunqConnector.EstablishConnection();
        if(!token || !userData){
            throw new Error("Cannot fech data since connection to server wasn't established properly");
        }
        const { MONETARY_ACCOUNT_NUMBER } = LoadEnvVariables();
        if(!MONETARY_ACCOUNT_NUMBER){
            throw new Error("Cannot fetch data since there is no monetary account number, please check .env file")
        }

        log.info("Starting with payment fetching");
        await this.GetPayments(token.toString(), userData.id, MONETARY_ACCOUNT_NUMBER);

        return await this.m_dataStore.GetAllEntries();
    }

    public GetMonetaryAccounts = async (token: string, user: UserPerson): Promise<MonetaryAccountBank[]> => {
        const { BUNQ_URL } = LoadEnvVariables();
        const url = BUNQ_URL + `/user/${user.id}/monetary-account`;
        const request = this.CreateRequest(url, token);

        const response = await fetch(request);

        const repsonseObj = (await response.json()) as MonetaryAccountData;

        const responseTransformed = repsonseObj.Response.map((bankAccount) => {
            return bankAccount.MonetaryAccountBank;
        });
        return responseTransformed;
    }

    private GetPayments =  async (token: string, userId: number, accountId: number) => {
        const { BUNQ_URL } = LoadEnvVariables();
        let dataAvaliable = true;
        let iteration = 0;
        let url =
            BUNQ_URL +
            `user/${userId}/monetary-account/${accountId}/payment?count=200`;

        while (dataAvaliable) {
            const request = this.CreateRequest(url, token);
            const response = await fetch(request);
            const responseData = await response.json();

            for await (const payment of responseData.Response as [
                { Payment: Payment },
            ]) {
                try {
                    const pym = payment.Payment as Payment;
                    const created = new Date(pym.created);
                    const createdInt = Math.round(created.getTime() / 1000);
                    const updatedInt = Math.round(created.getTime() / 1000);
                    const paymentEntry: PaymentEntry = {
                        id: pym.id,
                        created: createdInt,
                        updated: updatedInt,
                        monetary_account_id: pym.monetary_account_id,
                        amount: parseFloat(pym.amount.value),
                        currency: pym.amount.currency,
                        description: pym.description,
                        type: pym.type,
                        iban: pym.counterparty_alias.iban,
                        name: pym.counterparty_alias.display_name,
                        category_code:
                            pym.counterparty_alias.merchant_category_code,
                        subtype: pym.subtype,
                        balance_after: parseFloat(pym.balance_after_mutation.value),
                    };

                    await this.m_dataStore.SaveEntry(paymentEntry);

                } catch (error) {
                    console.log(error);
                }
            }

            iteration++;

            const olderUrl = responseData.Pagination.older_url as string | null;

            if (olderUrl === null) {
                dataAvaliable = false;
            }

            if (olderUrl !== null) {
                url = BUNQ_URL + olderUrl.substring(4, olderUrl.length);
            }

            if (iteration > 0 && iteration % 10 === 0) {
                log.success("Recieved 10 requests from bunq server");
            }
        }
    }

    private CreateRequest(url: string ,token: string){
        return new Request(url, {
            method: "GET",
            headers: {
                "X-Bunq-Client-Authentication": token
            }
        })
    }

    // state:
    private m_bunqConnector: BunqConnector;
    private m_dataStore: IDataStore;
}
