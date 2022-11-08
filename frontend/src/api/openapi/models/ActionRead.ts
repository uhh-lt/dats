/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ActionTargetObjectType } from "./ActionTargetObjectType";
import type { ActionType } from "./ActionType";

export type ActionRead = {
  /**
   * TODO
   */
  action_type: ActionType;
  /**
   * ID of the Memo
   */
  id: number;
  /**
   * User the Memo belongs to
   */
  user_id: number;
  /**
   * Project the Memo belongs to
   */
  project_id: number;
  /**
   * Updated timestamp of the Memo
   */
  executed: string;
  /**
   * ID of the Object the Memo is attached to
   */
  target_id: number;
  /**
   * Type of the Object the ID refers to
   */
  target_object_type: ActionTargetObjectType;
};
