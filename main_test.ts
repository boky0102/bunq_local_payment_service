import { assertEquals } from "@std/assert";
import {describe, it, beforeAll, afterAll} from "jsr:@std/testing/bdd"
import { CreateApplication, CreateRouter, StartApplication } from "./main.ts";
import { readTmpFile } from "./utility/utility.ts";
import { Router } from "@oak/oak/router";
import { Application } from "@oak/oak/application";
import { KeyManager } from "./key_manager.ts";
import { BunqConnector } from "./bunq_connector.ts";

describe("Application", () => {
    let router: Router;
    let app: Application;
    let abortController: AbortController;

    beforeAll(() => {
        router = CreateRouter()
        app = CreateApplication(router);
        abortController = new AbortController();
        StartApplication(app, abortController);
    })

    it("Should save port number to a file in tmp dir", async () => {
        const savedPort = await readTmpFile("bunq-service-port.txt");
        assertEquals(true, savedPort.length >= 4);
    })

    it("Should create key pairs if they don't exist", async () => {

    })

    it("Should successfully start transaction fetcher", async () => {

    })

    afterAll(()=> {
       abortController.abort();
   })
});

describe("Bunq Connector", () => {
    beforeAll(async () => {
        const keyManager = new KeyManager();
        const { privateKey, publicKey} = await keyManager.GetKeys();
        const bunqConnector = new BunqConnector(publicKey, privateKey);
        await bunqConnector.EstablishConnection();
    })
})
