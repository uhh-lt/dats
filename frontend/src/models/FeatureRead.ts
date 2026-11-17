/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ArtefactRead } from "./ArtefactRead";
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
   * Whether a new Project enables the Feature unless the request names its Features
   */
  default_enabled: boolean;
  /**
   * The Artefacts the Feature requires besides the core Artefacts: what enabling it computes
   */
  artefacts: Array<ArtefactRead>;
};
