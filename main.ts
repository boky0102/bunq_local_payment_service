import { CreateApplication, CreateFetcher, StartApplication } from "./server.ts";
import { InMemoryStoreObject } from "./src/datastore/datastore.ts";
import { log } from "./src/utility/logger.ts";
import { CreateRouter } from "./src/service/controller.ts";

// Main function to start the service.
// TODO: Add config file and inject is as a JSON


async function main(){
    try{
        const dataStore = new InMemoryStoreObject();
        const router = CreateRouter(dataStore);
        const app = CreateApplication(router);
        const abortController = new AbortController();
        const fetcher = CreateFetcher(dataStore);
        await StartApplication(app, abortController, fetcher);
    }
     catch(error){
        log.error("Internal application crashed");
        console.error(error);
    }
}

await main();
