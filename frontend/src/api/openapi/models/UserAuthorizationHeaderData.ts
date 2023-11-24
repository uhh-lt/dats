/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type UserAuthorizationHeaderData = {
  /**
   * Value of the JWT
   */
  access_token: string;
  access_token_expires: string;
  /**
   * For obtaining a new access token
   */
  refresh_token: string;
  refresh_token_expires: string;
  /**
   * Type of the Token
   */
  token_type: string;
};
