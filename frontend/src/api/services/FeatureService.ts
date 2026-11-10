/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureRead } from "@models/FeatureRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class FeatureService {
  /**
   * Returns all Features a Project can enable, with the Features they require
   * @returns FeatureRead Successful Response
   * @throws ApiError
   */
  public static getAll(): CancelablePromise<Array<FeatureRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/feature",
    });
  }
}
