/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserAuthorizationHeaderData = {
  /**
   * Value of the JWT
   */
  access_token: string;
  /**
   * Expiration timestamp of the access token
   */
  access_token_expires: string;
  /**
   * For obtaining a new access token
   */
  refresh_token: string;
  /**
   * Expiration timestamp of the refresh token
   */
  refresh_token_expires: string;
  /**
   * Type of the Token
   */
  token_type: string;
};
