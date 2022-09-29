/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { DocumentTagRead } from "./DocumentTagRead";

export type TagStat = {
  /**
   * The counted document tag.
   */
  tag: DocumentTagRead;
  /**
   * Number of occurrences of the document tag.
   */
  count: number;
};
