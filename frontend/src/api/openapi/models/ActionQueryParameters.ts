/* generated using openapi-typescript-codegen -- do no edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ActionTargetObjectType } from "./ActionTargetObjectType";
import type { ActionType } from "./ActionType";
export type ActionQueryParameters = {
  /**
   * ID of the Project
   */
  proj_id: number;
  /**
   * IDs of the Users
   */
  user_ids: Array<number>;
  /**
   * Types of the Actions
   */
  action_types: Array<ActionType>;
  /**
   * Types of the Action Targets
   */
  action_targets: Array<ActionTargetObjectType>;
  /**
   * Start date of the Actions
   */
  timestamp_from: number;
  /**
   * End date of the Actions
   */
  timestamp_to: number;
};
