/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { SdocSentencePair } from "./SdocSentencePair";
export type AnnoscalingConfirmSuggest = {
  /**
   * Code to apply on accepted spans
   */
  code_id: number;
  /**
   * Code to apply on rejected spans
   */
  reject_code_id: number;
  /**
   * Suggested annotations to accept
   */
  accept: Array<SdocSentencePair>;
  /**
   * Suggested annotations to reject
   */
  reject: Array<SdocSentencePair>;
};
