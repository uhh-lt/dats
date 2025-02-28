/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type DocumentTagRecommendationJobRead = {
  /**
   * ID of the user who created the recommendation
   */
  user_id: number;
  /**
   * ID of the project this recommendation belongs to
   */
  project_id: number;
  /**
   * ID of the recommendation task
   */
  task_id: number;
  /**
   * Creation timestamp of the recommendation task.
   */
  created: string;
};
