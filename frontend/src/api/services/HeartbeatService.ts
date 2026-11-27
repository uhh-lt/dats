/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class HeartbeatService {
  /**
   * Answers true while the API is up
   * @returns boolean Successful Response
   * @throws ApiError
   */
  public static heartbeat(): CancelablePromise<boolean> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/heartbeat",
    });
  }
}
