/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { AnnotationParams } from "./AnnotationParams";
import type { ApproachType } from "./ApproachType";
import type { DocumentTaggingParams } from "./DocumentTaggingParams";
import type { FewShotParams } from "./FewShotParams";
import type { MetadataExtractionParams } from "./MetadataExtractionParams";
import type { ModelTrainingParams } from "./ModelTrainingParams";
import type { SentenceAnnotationParams } from "./SentenceAnnotationParams";
import type { TaskType } from "./TaskType";
import type { ZeroShotParams } from "./ZeroShotParams";
export type LLMJobParameters2_Input = {
  /**
   * The type of the LLMJob (what to llm)
   */
  llm_job_type: TaskType;
  /**
   * The ID of the Project to analyse
   */
  project_id: number;
  /**
   * Specific parameters for the LLMJob w.r.t it's type
   */
  specific_task_parameters:
    | DocumentTaggingParams
    | MetadataExtractionParams
    | AnnotationParams
    | SentenceAnnotationParams;
  /**
   * The approach to use for the LLMJob
   */
  llm_approach_type: ApproachType;
  /**
   * Specific parameters for the approach w.r.t it's type
   */
  specific_approach_parameters: ZeroShotParams | FewShotParams | ModelTrainingParams;
};
