/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TagRecommendationMethod } from "./TagRecommendationMethod";
export type TagRecommendationJobInput = {
  /**
   * The ID of the Project to recommend tags in
   */
  project_id: number;
  /**
   * Tags are mutually exclusive if `False`
   */
  multi_class?: boolean;
  /**
   * Tags to consider. If empty, all tags applied to any document are considered.
   */
  tag_ids?: Array<number>;
  /**
   * Method to use for suggestions
   */
  method?: TagRecommendationMethod;
};
