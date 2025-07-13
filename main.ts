import {Application} from "jsr:@oak/oak/application";
import {Router} from 'jsr:@oak/oak/router';
import {readTmpFile, saveToTmp} from './src/utility/utility.ts'
import { Fetcher } from "./src/fetcher/fetcher.ts";
import { KeyManager } from "./src/fetcher/key_manager.ts";
import { log } from "./src/utility/logger.ts";
import { BunqConnector } from "./src/fetcher/bunq_connector.ts";
import { IDataStore, InMemoryStoreObject } from "./src/datastore/datastore.ts";

// Main function to start the service.
// TODO: Add config file and inject is as a JSON

export const dataStore = new InMemoryStoreObject();

export async function StartApplication(app: Application, abortController: AbortController){
    log.info("Trying to start the application");

    const fetcher = CreateFetcher(dataStore);
    await fetcher.FetchData();

    const { signal } = abortController;
    return app.listen({signal: signal});
}

export function CreateRouter(): Router{
    const router = new Router();

    router.get("/", (ctx) => {
      ctx.response.body = `<!DOCTYPE html>
        <html>
          <head><title>Hello oak!</title><head>
          <body>
            <h1>Hello oak!</h1>
          </body>
        </html>
      `;
    });

    return router;
}

export function CreateApplication(router: Router) :Application {
    const app = new Application();
    app.use(router.routes());
    app.use(router.allowedMethods());

    app.addEventListener("listen", async (state) => {
        log.info(`Application started and running on port ${state.port}`);
        await saveToTmp(state.port);
        await readTmpFile("bunq-service-port.txt");
    })

    return app;
}

function CreateFetcher(dataStore: IDataStore){
    const keyManger = new KeyManager();
    const bunqConnector = new BunqConnector(keyManger);

    return new Fetcher(bunqConnector, dataStore);
}

const router = CreateRouter();
const app = CreateApplication(router);
const abortController = new AbortController();
await StartApplication(app, abortController);
