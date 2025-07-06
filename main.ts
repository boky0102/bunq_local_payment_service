import {Application} from "jsr:@oak/oak/application";
import {Router} from 'jsr:@oak/oak/router';
import {saveToTmp} from './utility/utility.ts'

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

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen();

app.addEventListener("listen", (state) => {
    console.log(`Application running on port ${state.port}`);
    saveToTmp(state.port);
})
