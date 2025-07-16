import { Router } from "@oak/oak/router";
import { log } from "../utility/logger.ts"
import { IDataStore } from "../datastore/datastore.ts";

const CreateRouter = (dataStore: IDataStore) => {
    const router = new Router();

    router.get("/all-data", async (ctx) => {
        if(!await dataStore.HasContent()){
            ctx.response.status = 301;
        }

        ctx.response.status = 200;
        ctx.response.headers.set("Content-Type", "application/json");
        log.debug("here I am")
        ctx.response.body = await dataStore.GetAllEntries();
    })

    router.get("/", (ctx) => {
        ctx.response.body = Array.from(["bla", "bla"]);
    })

    return router;
}

export { CreateRouter }
