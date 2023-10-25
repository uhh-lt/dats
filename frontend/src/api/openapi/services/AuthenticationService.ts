/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Body_authentication_login } from "../models/Body_authentication_login";
import type { UserAuthorizationHeaderData } from "../models/UserAuthorizationHeaderData";
import type { UserCreate } from "../models/UserCreate";
import type { UserRead } from "../models/UserRead";

import type { CancelablePromise } from "../core/CancelablePromise";
import { OpenAPI } from "../core/OpenAPI";
import { request as __request } from "../core/request";

export class AuthenticationService {
  /**
   * Registers a new User
   * Registers a new User and returns it with the generated ID.
   * @returns UserRead Successful Response
   * @throws ApiError
   */
  public static register({ requestBody }: { requestBody: UserCreate }): CancelablePromise<UserRead> {
    return __request(OpenAPI, {
      method: "POST",
      url: "/authentication/register",
      body: requestBody,
      mediaType: "application/json",
      errors: {
        422: `Validation Error`,
      },
    });
  }

  /**
   * Returns the JWT access token for the provided user login data
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
}
