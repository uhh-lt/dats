/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ClassifierClassStatistics = {
  /**
   * ID of the class (tag or code)
   */
  class_id: number;
  /**
   * Number of examples for the class (annotations / tagged docs)
   */
  num_examples: number;
  /**
   * Number of units (tokens / sentences / documents) of the class
   */
  num_units: number;
  /**
   * Percentage of units of the class relative to all units
   */
  unit_percentage: number;
};
