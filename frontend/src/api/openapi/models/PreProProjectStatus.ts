/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type PreProProjectStatus = {
  /**
   * Project ID this PreProProjectStatus refers to.
   */
  project_id: number;
  /**
   * Flag if Preprocessing is in progress.
   */
  in_progress: boolean;
  /**
   * Number of SourceDocuments that are getting preprocessed.
   */
  num_sdocs_in_progress: number;
  /**
   * Number of SourceDocuments preprocessing has finished.
   */
  num_sdocs_finished: number;
  /**
   * Number of total SourceDocuments.
   */
  num_sdocs_total: number;
};
