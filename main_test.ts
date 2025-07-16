import { assertEquals } from "@std/assert";
import {describe, it, beforeAll, afterAll} from "jsr:@std/testing/bdd"
import { IDataStore, InMemoryStoreObject } from "./src/datastore/datastore.ts";
import { Fetcher } from "./src/fetcher/fetcher.ts";
import { IKeyManager } from "./src/fetcher/key_manager.ts";
import { BunqConnector, IBunqConnector } from "./src/fetcher/bunq_connector.ts";
import { PaymentEntry } from "./src/fetcher/bunq.types.d.ts";
import { Application } from "@oak/oak/application";
import { superoak } from "https://deno.land/x/superoak/mod.ts";
import { CreateRouter } from "./src/service/controller.ts";
import { Router } from "@oak/oak/router";

const samplePaymentEntries: PaymentEntry[] = [
    {
        id: 1,
        created: 1705334400, // 2024-01-15 timestamp
        updated: 1705334400,
        monetary_account_id: 123456,
        amount: 100.50,
        currency: "EUR",
        description: "Test payment 1",
        type: "BUNQ",
        iban: "NL91ABNA0417164300",
        name: "John Doe",
        category_code: "5411",
        subtype: "PAYMENT",
        balance_after: 1500.50
    },
    {
        id: 2,
        created: 1705420800, // 2024-01-16 timestamp
        updated: 1705420800,
        monetary_account_id: 123456,
        amount: -75.25,
        currency: "EUR",
        description: "Test payment 2",
        type: "BUNQ",
        iban: "NL20INGB0001234567",
        name: "Jane Smith",
        category_code: "5812",
        subtype: "PAYMENT",
        balance_after: 1425.25
    },
    {
        id: 3,
        created: 1705507200, // 2024-01-17 timestamp
        updated: 1705507200,
        monetary_account_id: 123456,
        amount: 200.00,
        currency: "EUR",
        description: "Test payment 3",
        type: "BUNQ",
        iban: "NL43RABO0300065264",
        name: "Company ABC",
        subtype: "PAYMENT",
        balance_after: 1625.25
    }
];

describe("Fetcher", () => {

    let fetcher: Fetcher;
    const dataStore: InMemoryStoreObject = new InMemoryStoreObject();

    beforeAll(async () => {
        const mockKeyManager: IKeyManager = {
            GetKeys: () => Promise.resolve({privateKey: "privateKey", publicKey: "publicKey"})
        }

       const bunqConnectorBase = new BunqConnector(mockKeyManager);
       const mockBunqConnector = {
           ...bunqConnectorBase,
           GetPayments: () => Promise.resolve(samplePaymentEntries),
           GetMonetaryAccounts: () => Promise.resolve([{id: 123456}]),
           EstablishConnection: () => Promise.resolve()
       }

        fetcher = new Fetcher(mockBunqConnector , dataStore);
        await fetcher.FetchData();
    });

    it("should fetch data successfully", async () => {
        let threw = false;
        try {
            await fetcher.FetchData();
        } catch (_error) {
            threw = true;
        }

        assertEquals(false, threw);
    });

    it("should save data to the data store", async () => {
        await fetcher.FetchData();
        const data = await dataStore.GetAllEntries();
        data.forEach((entry) => {
            assertEquals(samplePaymentEntries.includes(entry), true);
        });
    });

});

async function CreateMockApplicationContext(
    dataStore: IDataStore | undefined = undefined,
    bunqConnector: IBunqConnector | undefined = undefined,
    keyManager: IKeyManager | undefined = undefined) : Promise<[Application, Fetcher]>{

        let mockDataStore: IDataStore | undefined  = dataStore;
        let mockKeyManager: IKeyManager | undefined = keyManager;
        let mockBunqConnector: IBunqConnector | undefined = bunqConnector;

        if(!mockDataStore){
            mockDataStore = {
                GetAllEntries: () => {
                    return Promise.resolve(samplePaymentEntries);
                },
                HasContent: () => {
                    return Promise.resolve(true)
                },
                SaveEntry: async (entry: PaymentEntry) => {
                    return;
                }
            }
        }

        if(!mockKeyManager){
            mockKeyManager ={
                GetKeys: () => {
                    return Promise.resolve({
                        publicKey: "publicKey",
                        privateKey: "privateKey"
                    });
                }
            }
        }

        if(!mockBunqConnector){
            mockBunqConnector = {
                GetPayments: () => Promise.resolve(samplePaymentEntries),
                EstablishConnection: () => Promise.resolve(),
                ConnectionEstablished: () => true
            }
        }

        const fetcher = new Fetcher(mockBunqConnector, mockDataStore);
        const router = CreateRouter(mockDataStore);

        const app = new Application();
        app.use(router.routes());
        app.use(router.allowedMethods());

        return Promise.resolve([app, fetcher]);
}

describe("Service", () => {
    let fetcher: Fetcher;
    const mockDataStore: IDataStore = {
        GetAllEntries: () => {
            return Promise.resolve(samplePaymentEntries);
        },
        HasContent: () => {
            return Promise.resolve(true)
        },
        SaveEntry: async (entry: PaymentEntry) => {
            return;
        }
    }
    const abortController = new AbortController();
    const app = new Application();
    const router = CreateRouter(mockDataStore);
    app.use(router.routes());
    app.use(router.allowedMethods());

    beforeAll(async () => {
        const mockKeyManager: IKeyManager = {
            GetKeys: () => Promise.resolve({privateKey: "privateKey", publicKey: "publicKey"})
        }

       const bunqConnectorBase = new BunqConnector(mockKeyManager);
       const mockBunqConnector = {
           ...bunqConnectorBase,
           GetPayments: () => Promise.resolve(samplePaymentEntries),
           GetMonetaryAccounts: () => Promise.resolve([{id: 123456}]),
           EstablishConnection: () => Promise.resolve()
       }

        fetcher = new Fetcher(mockBunqConnector, mockDataStore);
        await fetcher.FetchData();
    });

    it("Should return all payment data on GET /all-data", async () => {
        const request = await superoak(app);
        await request.get("/all-data").expect(200, samplePaymentEntries);
    });

    it("Should return status 204 on GET /all-data when no data available", async () => {
        const request = await superoak(app);
        await request.get("/all-data").expect(204);
    });

    afterAll(() => {
        abortController.abort();
    });
});
