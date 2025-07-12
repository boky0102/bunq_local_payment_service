import {log} from "./logger.ts"

type EnvVriables = {
    BUNQ_API_KEY: string,
    BUNQ_URL: string,
    IP_ADDRESS: string,
    MONETARY_ACCOUNT_NUMBER: number | undefined
}

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

export const LoadEnvVariables = () : EnvVriables => {
    log.info("Trying to load env variables");
    const bunqKey = Deno.env.get("BUNQ_API_KEY");
    const localIp = Deno.env.get("IP_ADDRESS");
    const bunqUrl = Deno.env.get("BUNQ_URL");
    const monetaryAccountNumber = Deno.env.get("MONETARY_ACCOUNT_ID");

    let accountId = undefined;
    if(monetaryAccountNumber){
        accountId = parseInt(monetaryAccountNumber);
    }

    if(!bunqKey || !localIp || !bunqUrl){
        log.error("Env variables aren't set up properly");
        console.log("bunq key", bunqKey);
        console.log("bunq url", bunqUrl);
        console.log("ip add", localIp);
        throw new Error("Env variables");
    }

    return {
        BUNQ_API_KEY: bunqKey,
        BUNQ_URL: bunqUrl,
        IP_ADDRESS: localIp,
        MONETARY_ACCOUNT_NUMBER: accountId
    }
}

/* TODO : add function to get the ip address of the host */
