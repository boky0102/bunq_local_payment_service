import {Application} from "jsr:@oak/oak/application";
import {Router} from 'jsr:@oak/oak/router';
import {readTmpFile, saveToTmp} from './src/utility/utility.ts'
import { Fetcher } from "./src/fetcher/fetcher.ts";
import { KeyManager } from "./src/fetcher/key_manager.ts";
import { log } from "./src/utility/logger.ts";
import { BunqConnector } from "./src/fetcher/bunq_connector.ts";
import { IDataStore } from "./src/datastore/datastore.ts";

export async function StartApplication(app: Application, abortController: AbortController, fetcher: Fetcher){
    log.info("Trying to start the application");

    await fetcher.FetchData();

    const { signal } = abortController;
    return app.listen({signal: signal});
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

export function CreateFetcher(dataStore: IDataStore){
    const keyManger = new KeyManager();
    const bunqConnector = new BunqConnector(keyManger);

    return new Fetcher(bunqConnector, dataStore);
}
