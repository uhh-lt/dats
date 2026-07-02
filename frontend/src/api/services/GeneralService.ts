/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { InstanceInfo } from "../models/InstanceInfo";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class GeneralService {
  /**
   * Heartbeat
   * @returns any Successful Response
   * @throws ApiError
   */
  public static heartbeat(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/heartbeat",
    });
  }
  /**
   * Info
   * @returns InstanceInfo Successful Response
   * @throws ApiError
   */
  public static info(): CancelablePromise<InstanceInfo> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/info",
    });
  }
  /**
   * Redirection to /docs
   * @returns any Successful Response
   * @throws ApiError
   */
  public static rootToDocs(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/",
    });
  }
}
