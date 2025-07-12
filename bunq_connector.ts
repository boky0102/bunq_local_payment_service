import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";

import { UserPerson } from "./bunq.types.d.ts";
import { BunqInstallResponse, SessionData } from "./bunq.types.d.ts";
import { log } from "./utility/logger.ts";
import { Token } from "npm:path-to-regexp@^6.3.0";
import { IKeyManager } from "./key_manager.ts";

type EnvVriables = {
    BUNQ_API_KEY: string,
    BUNQ_URL: string,
    IP_ADDRESS: string,
    MONETARY_ACCOUNT_NUMBER: number | undefined
}

export class BunqConnector {
    constructor(keyManger: IKeyManager){
        this.m_keyManger = keyManger;
        this.m_devicePosted = false;
        this.LoadEnvVariables();
    }

    public EstablishConnection = async () => {
        if(this.ConnectionEstablished()){
            return [this.m_sessionToken, this.m_userData];
        }

        const { privateKey, publicKey } = await this.m_keyManger.GetKeys();
        this.m_privateKey = privateKey;
        this.m_publicKey = publicKey;

        await this.CreateInstallation();
        await this.RegisterDevice();
        return await this.EstablishSession();
    }

    public ConnectionEstablished = () => {
        return this.m_sessionToken && this.m_userData
    }

    /*
        Creates a installation with a bunq server, only public key is required here.
        Needs: generated public key
        Returns: installation token, public key of the bunq server
        This operation needs to be done only once.
    */
    private CreateInstallation = async () => {
        const { BUNQ_URL } = this.LoadEnvVariables();

        log.info("Checking if installation data exists.");
        if(this.m_installationData !== undefined){
            log.info("Installation data existst already");
            return;
        }

        log.info("Installation data needs to be fetched. Trying to fetch the data");
        this.m_installationData = await this.PostInstallationData(BUNQ_URL);

        log.success("Successfully fetched installation data.");
    }

    /*
        Registered current device with the bunq server. Main input is the
        ip address in the .env file. In future this ip address will automatically
        fetched from the OS info.
    */
    private RegisterDevice = async () => {
        log.info("Trying to post device information");
        if(this.m_devicePosted){
            log.info("Device information is already posted");
        }

        await this.PostDeviceInformation();
        this.m_devicePosted = true;
    }

    /* Final step to open the session with bunq server
       Needs: Installation token, api key
       Returns: Session token and user object
    */
    private EstablishSession = async () => {
        if(!this.m_devicePosted){
            throw new Error("Cannot start a session without device information being posted");
        }

        return await this.GetSessionToken();
    }

    private LoadEnvVariables = () : EnvVriables => {
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

    private PostInstallationData = async (bunqUrl: string) => {
        const data = {
            client_public_key: this.m_publicKey,
        };

        const jsonData = JSON.stringify(data);

        const request = new Request(bunqUrl + "installation", {
            method: "POST",
            body: jsonData,
        });

        const response = await fetch(request);
        const responseData = (await response.json()) as BunqInstallResponse;

        if (response.status !== 200) {
            log.error("******** CAN'T GET INSTALLATION TOKEN - STEP 1 *********");
            console.log(responseData);
            throw new Error("Cant get installation running");
        }

        log.success("___INSTALATION COMPLETE___");
        return responseData;
    }

    private PostDeviceInformation = async () => {
        if(!this.m_installationData){
            throw new Error("No installation data, please check installation logic");
        }

        log.info("Creating post device request");
        const { BUNQ_API_KEY, IP_ADDRESS, BUNQ_URL } = this.LoadEnvVariables();
        const data = JSON.stringify({
            description: "bla",
            secret: BUNQ_API_KEY,
            permitted_ips: [IP_ADDRESS]
        });

        const signature = this.SignRequestBody(data);

        const request = new Request(BUNQ_URL + "device-server", {
            method: "POST",
            body: data,
            headers: {
                "X-Bunq-Client-Signature": signature.toString("base64"),
                "X-Bunq-Client-Authentication": this.m_installationData.Response[1].Token.token,
                Authentication: `Bearer ${BUNQ_API_KEY}`,
            },
        });

        log.info("Created device request successfully. Posting device data.");
        const response = await fetch(request);
        if(response.status !== 200){
            console.log(response);
            throw new Error("Device data could not be posted successfully");
        }

        response.body?.cancel();
        log.success("Device posted successfully");
    }

    private SignRequestBody = (deviceBodyString: string) => {
        if(!this.m_privateKey){
            throw new Error("Private key not available");
        }

        return crypto.sign("sha256", Buffer.from(deviceBodyString), {
                key: this.m_privateKey
            })
    }

    private GetSessionToken = async () :Promise<[Token, UserPerson]> => {
        if(this.m_sessionToken && this.m_userData){
            log.info("User data and session token already exist, no need to fetch");
            return [this.m_sessionToken, this.m_userData]
        }

        if(!this.m_installationData){
            throw new Error("Cannot make a session token request without the installation data");
        }

        const { BUNQ_API_KEY, BUNQ_URL } = this.LoadEnvVariables();

        const postBody = JSON.stringify({
            secret: BUNQ_API_KEY
        });
        const signature = this.SignRequestBody(postBody);

        const request = new Request(BUNQ_URL + "session-server", {
            method: "POST",
            body: postBody,
            headers: {
                "X-Bunq-Client-Signature": signature.toString("base64"),
                "X-Bunq-Client-Authentication": this.m_installationData.Response[1].Token.token,
           },
        });

        log.info("Trying to establish new sesion and get a user data and session token");
        const response = await fetch(request);
        if(response.status !== 200){
           console.log(response);
           throw new Error("Wasn't able to establish a new session");
        }

        log.success("Successfully established session with the bunq server");
        const responseData = (await response.json()) as SessionData;
        const [ , token, userData] = responseData.Response;

        return [token.Token.token, userData.UserPerson]
    }

    private m_keyManger: IKeyManager;
    private m_publicKey: string | undefined;
    private m_privateKey: string | undefined;
    private m_installationData: BunqInstallResponse | undefined;
    private m_devicePosted: boolean;
    private m_sessionToken: Token | undefined;
    private m_userData: UserPerson | undefined;
}
