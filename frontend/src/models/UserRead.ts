/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { UserKind } from "./UserKind";
export type UserRead = {
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
   * Whether the User is a human or virtual
   */
  kind: UserKind;
  /**
   * E-Mail of the User (None for virtual annotators)
   */
  email: string | null;
  /**
   * Project of a virtual annotator (None for human users)
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
