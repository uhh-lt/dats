/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Feature } from "./Feature";
import type { FeatureStatus } from "./FeatureStatus";
import type { JobType } from "./JobType";
/**
 * The state of a Feature in a Project.
 */
export type ProjectFeatureRead = {
  /**
   * ID of the Feature
   */
  feature: Feature;
  /**
   * Whether the Feature is enabled in the Project
   */
  enabled: boolean;
  /**
   * State of the Feature: disabled, computing (documents are processing or being planned), partly available (documents lack its data and nothing runs for them) or fully available
   */
  status: FeatureStatus;
  /**
   * Whether all documents the Feature applies to have its data
   */
  ready: boolean;
  /**
   * Number of documents the Feature applies to with all its steps finished
   */
  covered_documents: number;
  /**
   * Number of documents the Feature applies to with a step of it processing
   */
  processing_documents: number;
  /**
   * Number of documents the Feature applies to with a step of it erroneous and none processing
   */
  failed_documents: number;
  /**
   * Number of documents the Feature applies to with a step of it not planned, and none processing or erroneous
   */
  not_planned_documents: number;
  /**
   * Number of documents the Feature applies to that lack its data and for which nothing runs (failed plus not planned)
   */
  lacking_documents: number;
  /**
   * Number of documents the Feature applies to
   */
  total_documents: number;
  /**
   * The steps of the Feature that are not finished for at least one document
   */
  missing_steps: Array<JobType>;
};
