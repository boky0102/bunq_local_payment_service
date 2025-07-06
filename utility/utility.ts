import { assert } from "@std/assert/assert";
import {log} from "./logger.ts"
/*
    Function to save port information in the tmp txt file.
*/
export async function saveToTmp(port: number){
    await Deno.writeFile("/tmp/bunq-service-port.txt", new Uint8Array(port));
}
