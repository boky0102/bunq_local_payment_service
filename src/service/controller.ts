import { Router } from "@oak/oak/router";
import { IDataStore, NoDataInDataStoreError } from "../datastore/datastore.ts";
import { log } from "../utility/logger.ts";

const CreateRouter = (dataStore: IDataStore) => {
    const router = new Router();

    router.get("/all-data", async (ctx) => {
        try{

            const entries = await dataStore.GetAllEntries();
            ctx.response.status = 200;
            ctx.response.headers.set("Content-Type", "application/json");
            ctx.response.body = entries;
        }catch(error){
            if(error instanceof NoDataInDataStoreError){
                ctx.response.status = 204;
                return;
            }

            throw error;
        }
    })

    return router;
}

export { CreateRouter }
