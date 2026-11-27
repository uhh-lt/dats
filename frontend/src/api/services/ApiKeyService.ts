/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiKeyCreate } from "@models/ApiKeyCreate";
import type { ApiKeyCreatedResponse } from "@models/ApiKeyCreatedResponse";
import type { ApiKeyRead } from "@models/ApiKeyRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ApiKeyService {
  /**
   * List all active API keys for the current user.
   * @returns ApiKeyRead Successful Response
   * @throws ApiError
   */
  public static getByUser(): CancelablePromise<Array<ApiKeyRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/users/me/api-keys",
    });
  }
  /**
   * Generate a new API key with optional expiration.
   * @returns ApiKeyCreatedResponse Successful Response
   * @throws ApiError
   */
  public static create({ requestBody }: { requestBody: ApiKeyCreate }): CancelablePromise<ApiKeyCreatedResponse> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/users/me/api-keys",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Revoke/Delete an API key.
   * @returns ApiKeyRead Successful Response
   * @throws ApiError
   */
  public static deleteById({ apiKeyId }: { apiKeyId: number }): CancelablePromise<ApiKeyRead> {
    return __request(OpenAPI, {
      method: "DELETE",
      url: "/users/me/api-keys/{api_key_id}",
      path: {
        api_key_id: apiKeyId,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
}
