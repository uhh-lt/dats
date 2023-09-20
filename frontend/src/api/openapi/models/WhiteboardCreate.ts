/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

export type WhiteboardCreate = {
  /**
   * Title of the Whiteboard
   */
  title: string;
  /**
   * Content of the Whiteboard
   */
  content: string;
  /**
   * Project the Whiteboard belongs to
   */
  project_id: number;
  /**
   * User the Whiteboard belongs to
   */
  user_id: number;
};
