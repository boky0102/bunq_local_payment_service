import * as crypto from "node:crypto";
import { Buffer } from "node:buffer";

import { UserPerson } from "./bunq.types.d.ts";
import { BunqInstallResponse, SessionData } from "./bunq.types.d.ts";
import { log } from "../utility/logger.ts";
import { Token } from "npm:path-to-regexp@^6.3.0";
import { IKeyManager } from "./key_manager.ts";
import { LoadEnvVariables  } from "../utility/utility.ts";
import { Payment, PaymentEntry, MonetaryAccountData, MonetaryAccountBank } from "./bunq.types.d.ts";

/*
    This a class responsible for establishing connection with the bunq server.
    It provides methods for creating installation, registering device, and establishing session.
    It also provides methods for fetching payment entries.
*/

export interface IBunqConnector {
    EstablishConnection: () => Promise<void>;
    ConnectionEstablished: () => boolean;
    GetPayments: () => Promise<PaymentEntry[] | undefined>;
};

export class BunqConnector implements IBunqConnector {
    constructor(keyManger: IKeyManager){
        this.m_keyManger = keyManger;
        this.m_devicePosted = false;
    }

    /*
        Establish connection with the bunq server if the connection
        is established properly it will return array with two elements.
        Returning array consists of token and user data. In the case of failure it will
        throw
    */
    public EstablishConnection = async () => {
        if(this.ConnectionEstablished()){
            return;
        }

        const { privateKey, publicKey } = await this.m_keyManger.GetKeys();
        this.m_privateKey = privateKey;
        this.m_publicKey = publicKey;

        await this.CreateInstallation();
        await this.RegisterDevice();
        await this.EstablishSession();
    }

    public ConnectionEstablished = () : boolean => {
        return this.m_userData !== undefined && this.m_sessionToken !== undefined;
    }

    /*
        Creates a installation with a bunq server, only public key is required here.
        Needs: generated public key
        Returns: installation token, public key of the bunq server
        This operation needs to be done only once.
    */
    private CreateInstallation = async () => {
        const { BUNQ_URL } = LoadEnvVariables();

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

        await this.GetSessionToken();
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
        const { BUNQ_API_KEY, IP_ADDRESS, BUNQ_URL } = LoadEnvVariables();
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

    private GetSessionToken = async () => {
        if(this.m_sessionToken && this.m_userData){
            log.info("User data and session token already exist, no need to fetch");
            return [this.m_userData, this.m_sessionToken]
        }

        if(!this.m_installationData){
            throw new Error("Cannot make a session token request without the installation data");
        }

        const { BUNQ_API_KEY, BUNQ_URL } = LoadEnvVariables();

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
        const [_, token, userData] = responseData.Response;

        this.m_sessionToken = token.Token.token;
        this.m_userData = userData.UserPerson;
    }

    // TODO: Break from while loop when same transaction id is found
    public GetPayments =  async () => {
        if(!this.m_sessionToken || !this.m_userData){
            throw new Error("Session token is not set cannot fetch payments");
        }

        const { BUNQ_URL, MONETARY_ACCOUNT_NUMBER } = LoadEnvVariables();
        let dataAvaliable = true;
        let iteration = 0;
        let url =
            BUNQ_URL +
            `user/${this.m_userData.id}/monetary-account/${MONETARY_ACCOUNT_NUMBER}/payment?count=200`;

        while (dataAvaliable) {
            const request = this.CreateRequest(url, this.m_sessionToken.toString());
            const response = await fetch(request);
            const responseData = await response.json();

            for await (const payment of responseData.Response as [
                { Payment: Payment },
            ]) {
                try {
                    const pym = payment.Payment as Payment;
                    const created = new Date(pym.created);
                    const createdInt = Math.round(created.getTime() / 1000);
                    const updatedInt = Math.round(created.getTime() / 1000);
                    const paymentEntry: PaymentEntry = {
                        id: pym.id,
                        created: createdInt,
                        updated: updatedInt,
                        monetary_account_id: pym.monetary_account_id,
                        amount: parseFloat(pym.amount.value),
                        currency: pym.amount.currency,
                        description: pym.description,
                        type: pym.type,
                        iban: pym.counterparty_alias.iban,
                        name: pym.counterparty_alias.display_name,
                        category_code:
                            pym.counterparty_alias.merchant_category_code,
                        subtype: pym.subtype,
                        balance_after: parseFloat(pym.balance_after_mutation.value),
                    };

                    if(this.m_paymentData === undefined) {
                        this.m_paymentData = [];
                    }

                    this.m_paymentData.push(paymentEntry);

                } catch (error) {
                    console.log(error);
                }
            }

            iteration++;

            const olderUrl = responseData.Pagination.older_url as string | null;

            if (olderUrl === null) {
                dataAvaliable = false;
            }

            if (olderUrl !== null) {
                url = BUNQ_URL + olderUrl.substring(4, olderUrl.length);
            }

            if (iteration > 0 && iteration % 10 === 0) {
                log.success("Recieved 10 requests from bunq server");
            }
        }

        return this.m_paymentData;
    }

    // public GetMonetaryAccounts = async (token: string, user: UserPerson): Promise<MonetaryAccountBank[]> => {
    //     const { BUNQ_URL } = LoadEnvVariables();
    //     const url = BUNQ_URL + `/user/${user.id}/monetary-account`;
    //     const request = this.CreateRequest(url, token);

    //     const response = await fetch(request);

    //     const repsonseObj = (await response.json()) as MonetaryAccountData;

    //     const responseTransformed = repsonseObj.Response.map((bankAccount) => {
    //         return bankAccount.MonetaryAccountBank;
    //     });
    //     return responseTransformed;
    // }

    private CreateRequest(url: string ,token: string){
        return new Request(url, {
            method: "GET",
            headers: {
                "X-Bunq-Client-Authentication": token
            }
        })
    }

    private m_keyManger: IKeyManager;
    private m_publicKey: string | undefined;
    private m_privateKey: string | undefined;
    private m_installationData: BunqInstallResponse | undefined;
    private m_devicePosted: boolean;
    private m_sessionToken: Token | undefined;
    private m_userData: UserPerson | undefined;
    private m_paymentData: PaymentEntry[] | undefined;
}
