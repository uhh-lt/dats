/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AttachedObjectType } from "./AttachedObjectType";
export type MemoSuggestionRequest = {
  /**
   * Type of the object the memo is about
   */
  attached_object_type: AttachedObjectType;
  /**
   * ID of the object the memo is about
   */
  attached_object_id: number;
  /**
   * The LLM that writes the suggestion
   */
  model: string;
};
