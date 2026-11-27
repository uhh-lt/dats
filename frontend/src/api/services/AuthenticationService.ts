/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_authentication_login } from "@models/Body_authentication_login";
import type { RefreshAccessTokenData } from "@models/RefreshAccessTokenData";
import type { UserAuthorizationHeaderData } from "@models/UserAuthorizationHeaderData";
import type { UserCreate } from "@models/UserCreate";
import type { UserRead } from "@models/UserRead";
import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";
export class AuthenticationService {
  /**
   * Registers a new User and returns it with the generated ID.
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static register({ requestBody }: { requestBody: UserCreate }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "PUT",
      url: "/authentication/register",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns success if the user can access the content
   * @returns any Successful Response
   * @throws ApiError
   */
  public static authContent({ xOriginalUri }: { xOriginalUri?: string | null }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/authentication/content",
      headers: {
        "x-original-uri": xOriginalUri,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Redirects to the login page of the OIDC provider
   * @returns any Successful Response
   * @throws ApiError
   */
  public static oidcLogin({
    provider,
    redirectUri,
  }: {
    provider: string;
    redirectUri: string;
  }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/authentication/oidc/login",
      query: {
        provider: provider,
        redirect_uri: redirectUri,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Logs the user in after the OIDC provider redirected back
   * @returns any Successful Response
   * @throws ApiError
   */
  public static oidcCallback({ provider }: { provider: string }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "GET",
      url: "/authentication/oidc/callback",
      query: {
        provider: provider,
      },
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Returns the JWT access token for the provided user login data if the login was successful. This is usually only called from an OAuth2 client!
   * @returns UserAuthorizationHeaderData Successful Response
   * @throws ApiError
   */
  public static login({
    formData,
  }: {
    formData: Body_authentication_login;
  }): CancelablePromise<UserAuthorizationHeaderData> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/authentication/login",
      formData: formData,
      mediaType: "application/x-www-form-urlencoded",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Revokes the refresh token associated with the given session.
   * @returns any Successful Response
   * @throws ApiError
   */
  public static logout({ requestBody }: { requestBody: RefreshAccessTokenData }): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/authentication/logout",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Uses the given refresh token to obtain a new access token.
   * @returns UserAuthorizationHeaderData Successful Response
   * @throws ApiError
   */
  public static refreshAccess({
    requestBody,
  }: {
    requestBody: RefreshAccessTokenData;
  }): CancelablePromise<UserAuthorizationHeaderData> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/authentication/refresh-access",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }
  /**
   * Sets the access token of the request as the session cookie
   * @returns any Successful Response
   * @throws ApiError
   */
  public static syncSession(): CancelablePromise<any> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/authentication/sync-session",
    });
  }
}
