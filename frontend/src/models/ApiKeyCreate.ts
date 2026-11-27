/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ExpiryDuration } from "./ExpiryDuration";
export type ApiKeyCreate = {
  /**
   * Name of the ApiKey
   */
  name: string;
  /**
   * How long the ApiKey is valid
   */
  expires_in: ExpiryDuration;
};
