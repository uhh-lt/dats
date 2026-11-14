/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FeatureArea } from "./FeatureArea";
export type FeatureRead = {
  /**
   * Name of the Feature
   */
  feature: string;
  /**
   * Title of the Feature
   */
  title: string;
  /**
   * Description of the Feature
   */
  description: string;
  /**
   * Area of the Feature
   */
  area: FeatureArea;
  /**
   * Names of the Features this Feature requires (directly); enabling it enables them
   */
  requires_features: Array<string>;
  /**
   * Whether a new Project enables the Feature unless the request names its Features
   */
  default_enabled: boolean;
};
