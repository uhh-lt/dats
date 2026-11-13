/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Feature } from "./Feature";
export type ProjectRead = {
  /**
   * Title of the Project
   */
  title: string;
  /**
   * Description of the Project
   */
  description: string;
  /**
   * ID of the Project
   */
  id: number;
  /**
   * Created timestamp of the Project
   */
  created: string;
  /**
   * Updated timestamp of the Project
   */
  updated: string;
  /**
   * Features enabled in the Project
   */
  enabled_features: Array<Feature>;
};
