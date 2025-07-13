import { log } from "../utility/logger.ts";

type KeyPair = {
    publicKey: string,
    privateKey: string
}

export interface IKeyManager {
    GetKeys: () => Promise<KeyPair>;
}

export class KeyManager implements IKeyManager {
    public GetKeys = async () : Promise<KeyPair> => {
        await this.RunKeyCreationScript();

        const privateKey = await Deno.readTextFile("installation.key");
        const publicKey = await Deno.readTextFile("installation.pub");

        return {
            privateKey: privateKey,
            publicKey: publicKey
        }
    }

    private async RunKeyCreationScript() : Promise<void> {
        if(Deno.osRelease().startsWith("windows")){
            throw new Error("Windows is not currently supported");
        }

        if(this.KeysExist()){
            log.info("Key pair already exists, no generation necessary");
            return;
        }

        Deno.chmodSync("./create_key.sh", 0x763);
        const command = new Deno.Command("./create_key.sh");

        log.info("Trying to execute key creation script");
        const { code, stdout, stderr } = await command.output();

        if(code !== 0){
            log.error("Script execution unsucessfull");
            log.error(stderr.toString());

            throw new Error("Cannot execute create_key.sh script, please check file permisions");
        }
    }

    private KeysExist = () : boolean => {
        let pubFound = false;
        let privFound = false;

        for (const dirEntry of Deno.readDirSync("/")) {
            if(dirEntry.name === "installation.key"){
                privFound = true;
            }

            if(dirEntry.name === "installation.pub"){
                pubFound = true;
            }
        }

        return pubFound && privFound;
    }
}
