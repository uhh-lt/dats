/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ApiKeyRead = {
  /**
   * ID of the ApiKey
   */
  id: number;
  /**
   * Name of the ApiKey
   */
  name: string;
  /**
   * Public prefix of the ApiKey to identify it
   */
  prefix: string;
  /**
   * Expiration timestamp of the ApiKey (None = never expires)
   */
  expires_at: string | null;
  /**
   * Created timestamp of the ApiKey
   */
  created_at: string;
};
