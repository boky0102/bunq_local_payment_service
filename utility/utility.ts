import {log} from "./logger.ts"
/*
    Function to save port information in the tmp txt file.
*/
export async function saveToTmp(port: number){
    try{
        await Deno.writeTextFile("/tmp/bunq-service-port.txt", port.toString());
    } catch(error){
        log.error("Error while trying to save a port number to the tmp file.");
        console.log(error);
    }
}

export async function readTmpFile(fileName: string) :Promise<string>{
        const content = await Deno.readTextFile(`/tmp/${fileName}`);
        return content;
}
