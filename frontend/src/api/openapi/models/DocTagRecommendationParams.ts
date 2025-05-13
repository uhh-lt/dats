/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocTagRecommendationParams = {
  ml_job_type: string;
  /**
   * Whether tags are mutually exclusive
   */
  exclusive?: boolean;
  /**
   * Tags to consider. If empty, all tags applied to any document are considered.
   */
  tag_ids?: Array<number>;
};
