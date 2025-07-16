import { Router } from "@oak/oak/router";
import { IDataStore, NoDataInDataStoreError } from "../datastore/datastore.ts";

const CreateRouter = (dataStore: IDataStore) => {
    const router = new Router();

    router.get("/all-data", async (ctx) => {
        try{
            const entries = await dataStore.GetAllEntries();
            ctx.response.status = 200;
            ctx.response.headers.set("Content-Type", "application/json");
            ctx.response.body = entries;
        } catch (error) {
            if(error instanceof NoDataInDataStoreError){
                // no content
                ctx.response.status = 204;
            } else {
                ctx.response.status = 500;
            }
        }
    })

    router.get("/", (ctx) => {
        ctx.response.body = Array.from(["bla", "bla"]);
    })

    return router;
}

export { CreateRouter }
