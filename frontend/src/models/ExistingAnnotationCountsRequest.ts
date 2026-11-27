/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { TaskType } from "./TaskType";
export type ExistingAnnotationCountsRequest = {
  /**
   * The task of the LLM Assistant run
   */
  task_type: TaskType;
  /**
   * The virtual user of the run
   */
  virtual_user_id: number;
  /**
   * The SourceDocuments of the run
   */
  sdoc_ids: Array<number>;
  /**
   * The Codes of the run
   */
  code_ids: Array<number>;
};
