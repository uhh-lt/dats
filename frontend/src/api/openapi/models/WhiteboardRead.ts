/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { WhiteboardContent_Output } from "./WhiteboardContent_Output";
export type WhiteboardRead = {
  /**
   * Title of the Whiteboard
   */
  title: string;
  /**
   * ID of the Whiteboard
   */
  id: number;
  /**
   * Project the Whiteboard belongs to
   */
  project_id: number;
  /**
   * User the Whiteboard belongs to
   */
  user_id: number;
  /**
   * Created timestamp of the Whiteboard
   */
  created: string;
  /**
   * Updated timestamp of the Whiteboard
   */
  updated: string;
  /**
   * Content of the Whiteboard
   */
  content: WhiteboardContent_Output;
};
