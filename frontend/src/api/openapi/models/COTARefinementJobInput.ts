/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTARefinementHyperparameters } from "./COTARefinementHyperparameters";
export type COTARefinementJobInput = {
  /**
   * Project ID associated with the job
   */
  project_id: number;
  /**
   * ID of the COTA that is used in the COTARefinementJob
   */
  cota_id: number;
  /**
   * Hyperparameters of the COTARefinementJob
   */
  hyperparams?: COTARefinementHyperparameters;
};
