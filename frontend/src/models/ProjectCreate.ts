/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
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
   * Names of the Features enabled in the Project (null: the Features that declare default_enabled); the Features they require are enabled as well; an unknown name is rejected (404)
   */
  enabled_features?: Array<string> | null;
};
