import { Router } from "@oak/oak/router";
import { dataStore } from "../../main.ts";

const router = new Router();

router.get("/all-data", async (ctx) => {
    if(! await dataStore.HasContent()){
        ctx.response.status = 301;
    }

    ctx.response.status = 200;
    ctx.response.headers.set("Content-Type", "application/json");
    ctx.response.body = await dataStore.GetAllEntries();
})

export { router }
