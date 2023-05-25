/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { UserRead } from "./UserRead";

export type ProjectReadAction = {
  /**
   * Title of the Project
   */
  title: string;
  /**
   * Description of the Project
   */
  description: string;
  /**
   * ID of the Project
   */
  id: number;
  /**
   * Created timestamp of the Project
   */
  created: string;
  /**
   * Updated timestamp of the Project
   */
  updated: string;
  /**
   * Users of the Project
   */
  users: Array<UserRead>;
  /**
   * Number of Sdocs in the Project
   */
  num_sdocs: number;
};
