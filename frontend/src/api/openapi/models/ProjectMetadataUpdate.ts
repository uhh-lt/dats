/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { MetaType } from "./MetaType";

export type ProjectMetadataUpdate = {
  /**
   * Key of the ProjectMetadata
   */
  key?: string | null;
  /**
   * Type of the ProjectMetadata
   */
  metatype: MetaType | null;
};
