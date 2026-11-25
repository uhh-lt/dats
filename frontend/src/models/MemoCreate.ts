/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "./AttachedObjectType";
export type MemoCreate = {
  /**
   * Title of the Memo
   */
  title: string;
  /**
   * Optional Unicode emoji used as the Memo icon
   */
  icon?: string | null;
  /**
   * Textual content of the Memo
   */
  content: string;
  /**
   * JSON content of the Memo
   */
  content_json: string;
  /**
   * ID of the Object the Memo is attached to
   */
  attached_object_id: number;
  /**
   * Type of the Object the ID refers to
   */
  attached_object_type: AttachedObjectType;
};
