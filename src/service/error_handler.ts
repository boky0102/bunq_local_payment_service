import { Context } from "node:vm"
import { Next } from "@oak/oak/middleware";
import { HttpError, isHttpError } from "jsr:@oak/commons@1/http_errors";
import { NoDataInDataStoreError } from "../datastore/datastore.ts"
import { log } from "../utility/logger.ts";

export const errorHandler = async (ctx: Context, next: Next) => {
  try {
    await next();
  } catch (err) {
      let status = 500;
      let message = "Internal Server Error";
      if (isHttpError(err as HttpError)) {
          const error = err as HttpError;
          status = error.status;
          message = error.message;
      } else if (err instanceof NoDataInDataStoreError) {
          status = 204;
          message = err.message;
      } else {
          log.error("Internal Server Error occured");
          console.error("Unexpected error:", err);
          message = "Internal Server Error";
    }

    ctx.response.status = status;
    ctx.response.body = {
      error: message,
      status: status,

    };

    ctx.response.headers.set("Content-Type", "application/json");
  }
};
