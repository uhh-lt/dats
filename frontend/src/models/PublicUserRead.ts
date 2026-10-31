/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * A user object with information that everybody may see.
 */
export type PublicUserRead = {
  /**
   * ID of the User
   */
  id: number;
  /**
   * Whether the User is a virtual user (no login, one project)
   */
  is_virtual: boolean;
  /**
   * First name of the User
   */
  first_name: string;
  /**
   * Last name of the User
   */
  last_name: string;
};
