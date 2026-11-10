/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Feature } from "./Feature";
export type ProjectCreate = {
  /**
   * Title of the Project
   */
  title: string;
  /**
   * Description of the Project
   */
  description: string;
  /**
   * Features enabled in the Project (default: all); the Features they require are enabled as well
   */
  enabled_features?: Array<Feature>;
};
