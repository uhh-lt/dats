/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type HierarchicalElasticSearchHit = {
  /**
   * The ID of the Document
   */
  id: number;
  /**
   * The score of the Document that was found by a ES Query
   */
  score?: number | null;
  /**
   * The highlights found within the document.
   */
  highlights?: Array<string>;
  /**
   * Indicates if the hit is a folder (True) or a document (False).
   */
  is_folder: boolean;
  /**
   * Sub-rows of the hit, if it is a folder.
   */
  sub_rows: Array<HierarchicalElasticSearchHit>;
};
