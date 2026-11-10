/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Feature } from "./Feature";
export type FeatureRead = {
  /**
   * ID of the Feature
   */
  feature: Feature;
  /**
   * Title of the Feature
   */
  title: string;
  /**
   * Description of the Feature
   */
  description: string;
  /**
   * The Features this Feature requires (directly); enabling it enables them
   */
  requires_features: Array<Feature>;
};
