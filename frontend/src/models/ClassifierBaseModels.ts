/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierBaseModelOption } from "./ClassifierBaseModelOption";
export type ClassifierBaseModels = {
  /**
   * Selectable transformer base models (span & document classification)
   */
  transformer_models: Array<ClassifierBaseModelOption>;
  /**
   * Selectable embedding base models (sentence classification)
   */
  embedding_models: Array<ClassifierBaseModelOption>;
};
