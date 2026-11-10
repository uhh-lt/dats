/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Feature } from "./Feature";
export type ProjectUpdate = {
  /**
   * Title of the Project
   */
  title?: string | null;
  /**
   * Description of the Project
   */
  description?: string | null;
  /**
   * Features enabled in the Project; the Features they require are enabled as well
   */
  enabled_features?: Array<Feature> | null;
};
