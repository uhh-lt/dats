/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { AttachedObjectType } from "./AttachedObjectType";

export type MemoRead = {
  /**
   * Title of the Memo
   */
  title: string;
  /**
   * Content of the Memo
   */
  content: string;
  /**
   * ID of the Memo
   */
  id: number;
  /**
   * Starred flag of the Memo
   */
  starred: boolean;
  /**
   * User the Memo belongs to
   */
  user_id: number;
  /**
   * Project the Memo belongs to
   */
  project_id: number;
  /**
   * Created timestamp of the Memo
   */
  created: string;
  /**
   * Updated timestamp of the Memo
   */
  updated: string;
  /**
   * ID of the Object the Memo is attached to
   */
  attached_object_id: number;
  /**
   * Type of the Object the ID refers to
   */
  attached_object_type: AttachedObjectType;
};
