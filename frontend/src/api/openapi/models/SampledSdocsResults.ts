/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type SampledSdocsResults = {
  /**
   * The tags aggregated by.
   */
  tags: Array<number>;
  /**
   * The grouped SourceDocument IDs.
   */
  sdocs: Array<number>;
  /**
   * The fixed sample of SourceDocument IDs.
   */
  sample_fixed: Array<number>;
  /**
   * The relative sample of SourceDocument IDs.
   */
  sample_relative: Array<number>;
};
