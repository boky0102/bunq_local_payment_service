import { assertEquals } from "@std/assert";
import {describe, it, beforeAll, afterAll} from "jsr:@std/testing/bdd"
import { CreateApplication,  CreateFetcher } from "./main.ts";
import { InMemoryStoreObject } from "./src/datastore/datastore.ts";
import { router } from "./src/service/controller.ts";
import { Fetcher } from "./src/fetcher/fetcher.ts";
import { PaymentEntry } from "./src/fetcher/bunq.types.d.ts";

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

describe("Application", () => {
    beforeAll(() => {
        const dataStore = new InMemoryStoreObject();
        const fetcher : Fetcher = {
            FetchData: async ()  => {
                return samplePaymentEntries
            }
        }
        const app = CreateApplication(router);
    });

});
