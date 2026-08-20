/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "./AttachedObjectType";
/**
 * Row item DTO for memo search results (the `items` of a Page[MemoRow]).
 */
export type MemoRow = {
  /**
   * ID of the Memo
   */
  id: number;
  /**
   * Title of the Memo
   */
  title: string;
  /**
   * Icon of the Memo
   */
  icon: string | null;
  /**
   * Short excerpt of the Memo's content
   */
  content_excerpt: string;
  /**
   * User who authored the Memo
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
   * Whether the Memo is marked as favorite
   */
  is_favorite: boolean;
  /**
   * ID of the object the Memo is attached to
   */
  attached_object_id: number;
  /**
   * Type of the object the Memo is attached to
   */
  attached_object_type: AttachedObjectType;
};
