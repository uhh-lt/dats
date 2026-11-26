/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ApiKeyCreatedResponse } from "@models/ApiKeyCreatedResponse";
import type { ApiKeyRead } from "@models/ApiKeyRead";
import type { ExpiryDuration } from "@models/ExpiryDuration";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class ApiKeyService {
  /**
   * Generate a new API key with optional expiration.
   * @returns ApiKeyCreatedResponse Successful Response
   * @throws ApiError
   */
  public static createApiKey({
    name,
    expiresIn,
  }: {
    name: string;
    expiresIn: ExpiryDuration;
  }): CancelablePromise<ApiKeyCreatedResponse> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/users/me/api-keys",
      query: {
        name: name,
        expires_in: expiresIn,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * List all active API keys for the current user.
   * @returns ApiKeyRead Successful Response
   * @throws ApiError
   */
  public static listApiKeys(): CancelablePromise<Array<ApiKeyRead>> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/users/me/api-keys",
    });
  }
  /**
   * Revoke/Delete an API key.
   * @returns ApiKeyRead Successful Response
   * @throws ApiError
   */
  public static deleteApiKey({ apiKeyId }: { apiKeyId: number }): CancelablePromise<ApiKeyRead> {
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
