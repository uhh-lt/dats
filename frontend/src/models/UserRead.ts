/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type UserRead = {
  /**
   * E-Mail of the User
   */
  email: string;
  /**
   * First name of the User
   */
  first_name: string;
  /**
   * Last name of the User
   */
  last_name: string;
  /**
   * ID of the User
   */
  id: number;
  /**
   * Whether the User is a virtual user (one project, no login)
   */
  is_virtual: boolean;
  /**
   * Project of a virtual user (None for other users)
   */
  project_id: number | null;
  /**
   * Created timestamp of the User
   */
  created: string;
  /**
   * Updated timestamp of the User
   */
  updated: string;
};
