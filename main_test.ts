import { assertEquals } from "@std/assert";
import {describe, it } from "jsr:@std/testing/bdd"
import { IDataStore, NoDataInDataStoreError } from "./src/datastore/datastore.ts";
import { Fetcher } from "./src/fetcher/fetcher.ts";
import { IKeyManager } from "./src/fetcher/key_manager.ts";
import { IBunqConnector } from "./src/fetcher/bunq_connector.ts";
import { PaymentEntry } from "./src/fetcher/bunq.types.d.ts";
import { Application } from "@oak/oak/application";
import { superoak } from "https://deno.land/x/superoak/mod.ts";
import { CreateRouter } from "./src/service/controller.ts";
import { HttpError } from "jsr:@oak/commons@1/http_errors";
import { STATUS_CODE } from "jsr:@std/http@1";

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

type MockInterfacesContext = {
    mockDataStore?: IDataStore;
    mockKeyManager?: IKeyManager;
    mockBunqConnector?: IBunqConnector;
}

/**
 * Convenience method for creating a mock application context with optional mock interfaces.
 * If no interfaces are provided, default mock implementations are used.
 */
async function CreateMockApplicationContext({ mockDataStore = undefined, mockKeyManager = undefined, mockBunqConnector = undefined} : MockInterfacesContext = {} as MockInterfacesContext) :Promise<[Application, Fetcher, IDataStore]>{
    if(mockDataStore === undefined){
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

    if(mockKeyManager === undefined){
        mockKeyManager ={
            GetKeys: () => {
                return Promise.resolve({
                    publicKey: "publicKey",
                    privateKey: "privateKey"
                });
            }
        }
    }

    if(mockBunqConnector === undefined){
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

    return Promise.resolve([app, fetcher, mockDataStore]);
}

describe("Fetcher", () => {
    it("should fetch data successfully", async () => {
        const [_app, fetcher] = await CreateMockApplicationContext();
        let threw = false;
        try {
            await fetcher.FetchData();
        } catch (_error) {
            threw = true;
        }

        assertEquals(false, threw);
    });

    it("should save data to the data store", async () => {
        const [_app, fetcher, dataStore] = await CreateMockApplicationContext();
        await fetcher.FetchData();
        const data = await dataStore.GetAllEntries();
        data.forEach((entry) => {
            assertEquals(samplePaymentEntries.includes(entry), true);
        });
    });
});

describe("Service GET /all-data", () => {
    it("Should return all payment data", async () => {
        const [app, fetcher] = await CreateMockApplicationContext();
        await fetcher.FetchData();
        const request = await superoak(app);
        await request.get("/all-data").expect(200, samplePaymentEntries);
    });

    it("Should return all payments when fetcher returns nothing but store has data", async () => {
        const mockBunqConnector : IBunqConnector = {
            EstablishConnection: () => Promise.resolve(),
            ConnectionEstablished: () => true,
            GetPayments: () => Promise.resolve([])
        };

        const [app, fetcher] = await CreateMockApplicationContext({mockBunqConnector: mockBunqConnector});

        await fetcher.FetchData();
        const request = await superoak(app);
        await request.get("/all-data").expect(200);
    });

    it("Should return no payment data if data store is empty with status code 204", async () => {
        const mockBunqConnector : IBunqConnector = {
            EstablishConnection: () => Promise.resolve(),
            ConnectionEstablished: () => true,
            GetPayments: () => Promise.resolve(samplePaymentEntries)
        };

        const mockDataStore : IDataStore = {
            GetAllEntries: () => Promise.reject(new NoDataInDataStoreError("error")),
            SaveEntry: () => Promise.resolve(),
            HasContent: () => Promise.resolve(false)
        };

        const [app, fetcher] = await CreateMockApplicationContext({mockBunqConnector: mockBunqConnector, mockDataStore: mockDataStore});
        await fetcher.FetchData();

        const request = await superoak(app);
        await request.get("/all-data").expect(204);
    })

    it("Should return status 500 in the case of internal error", async () => {
        const mockDataStore : IDataStore = {
        GetAllEntries: () => Promise.reject(new Error("error")),
        SaveEntry: () => Promise.resolve(),
        HasContent: () => Promise.resolve(false)
        };

        const [app, fetcher] = await CreateMockApplicationContext({mockDataStore: mockDataStore});
        await fetcher.FetchData();

        const request = await superoak(app);
        await request.get("/all-data").expect(500);
    })

    it("Should return same response in the case of http error", async () => {
        const mockDataStore : IDataStore = {
            GetAllEntries: () => Promise.reject(new Deno.errors.NotFound("error")),
            SaveEntry: () => Promise.resolve(),
            HasContent: () => Promise.resolve(true)
        };

        const [app, fetcher] = await CreateMockApplicationContext({mockDataStore: mockDataStore});
        await fetcher.FetchData();

        const request = await superoak(app);
        await request.get("/all-data").expect(404);
    })
});
