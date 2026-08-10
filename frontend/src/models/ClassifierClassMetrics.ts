/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClassifierClassMetrics = {
  /**
   * ID of the class (tag or code)
   */
  class_id: number;
  /**
   * Precision score for the class
   */
  precision: number;
  /**
   * Recall score for the class
   */
  recall: number;
  /**
   * F1 score for the class
   */
  f1: number;
  /**
   * Number of gold instances of the class
   */
  support: number;
};
