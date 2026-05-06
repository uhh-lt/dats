/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PerspectivesJobType } from "./PerspectivesJobType";
import type { PerspectivesUserAction } from "./PerspectivesUserAction";
export type PerspectivesHistoryRead = {
  /**
   * Type of perspective action that generated this history entry
   */
  perspectives_action: PerspectivesUserAction | PerspectivesJobType;
  /**
   * The sequential number of the history entry
   */
  history_number: number;
  /**
   * Whether this history entry has been undone
   */
  is_undone?: boolean;
  /**
   * List of DB operations and their parameters required to undo the action
   */
  undo_data: Array<Record<string, Record<string, any>>>;
  /**
   * List of DB operations and their parameters required to redo the action
   */
  redo_data: Array<Record<string, Record<string, any>>>;
  /**
   * ID of the aspect this history entry belongs to
   */
  aspect_id: number;
  /**
   * ID of the history entry
   */
  id: number;
};
