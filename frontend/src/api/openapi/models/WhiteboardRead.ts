/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WhiteboardRead = {
  /**
   * Title of the Whiteboard
   */
  title: string;
  /**
   * Content of the Whiteboard
   */
  content: string;
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
};
