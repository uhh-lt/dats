/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { CodeChangeKind } from "./CodeChangeKind";
export type CodeRead = {
  /**
   * Name of the Code
   */
  name: string;
  /**
   * Color of the Code
   */
  color: string;
  /**
   * Description of the Code
   */
  description?: string;
  /**
   * Logical parent concept of the Code
   */
  parent_concept_id?: string | null;
  /**
   * Whether the code is available for annotation and preprocessing
   */
  enabled?: boolean;
  /**
   * Snapshot ID of the Code
   */
  id: number;
  /**
   * Logical identity of the Code
   */
  concept_id: string;
  /**
   * Project the Code belongs to
   */
  project_id: number;
  /**
   * Branch containing this snapshot
   */
  branch_id: number | null;
  /**
   * Main merge base snapshot
   */
  base_main_code_id: number | null;
  /**
   * Whether this is the active scope snapshot
   */
  is_active: boolean;
  /**
   * Whether this snapshot is a tombstone
   */
  is_deleted: boolean;
  /**
   * Author of this snapshot
   */
  author_id: number | null;
  /**
   * Optional change note
   */
  commit_message: string | null;
  /**
   * Operation that produced this snapshot
   */
  change_set_id: string;
  /**
   * Kind of codebook operation
   */
  change_kind: CodeChangeKind;
  /**
   * Snapshot used as the before state for this change
   */
  previous_code_id: number | null;
  /**
   * Branch snapshot promoted by this Main merge snapshot
   */
  merged_from_code_id: number | null;
  /**
   * Created timestamp of the snapshot
   */
  created: string;
  /**
   * Updated timestamp of the snapshot
   */
  updated: string;
  /**
   * Is the Code a system code
   */
  is_system: boolean;
  /**
   * Memo IDs attached to this snapshot
   */
  memo_ids: Array<number>;
};
