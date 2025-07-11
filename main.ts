import {Application} from "jsr:@oak/oak/application";
import {Router} from 'jsr:@oak/oak/router';
import {readTmpFile, saveToTmp} from './utility/utility.ts'

// Main function to start the service.
// TODO: Add config file and inject is as a JSON

export function StartApplication(app: Application, abortController: AbortController){
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
        console.log(`Application running on port ${state.port}`);
        await saveToTmp(state.port);
        await readTmpFile("bunq-service-port.txt");
    })

    return app;
}

const router = CreateRouter();
const app = CreateApplication(router);
const abortController = new AbortController();
StartApplication(app, abortController);
