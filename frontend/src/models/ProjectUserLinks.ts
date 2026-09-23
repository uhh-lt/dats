/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserRead } from "./UserRead";
/**
 * The complete resulting member list of a Project after a link/unlink operation.
 */
export type ProjectUserLinks = {
  /**
   * ID of the Project
   */
  project_id: number;
  /**
   * Complete list of Users linked to the Project
   */
  users: Array<UserRead>;
};
