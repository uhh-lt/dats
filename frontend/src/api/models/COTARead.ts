/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTAConcept } from "./COTAConcept";
import type { COTASentence } from "./COTASentence";
import type { COTATimelineSettings } from "./COTATimelineSettings";
import type { COTATrainingSettings } from "./COTATrainingSettings";
export type COTARead = {
  /**
   * Name of the ConceptOverTimeAnalysis
   */
  name: string;
  /**
   * ID of the ConceptOverTimeAnalysis
   */
  id: number;
  /**
   * Project the ConceptOverTimeAnalysis belongs to
   */
  project_id: number;
  /**
   * ID of the last refinement job for the ConceptOverTimeAnalysis
   */
  last_refinement_job_id: string | null;
  /**
   * Timeline Analysis Settings of the ConceptOverTimeAnalysis.
   */
  timeline_settings: COTATimelineSettings;
  /**
   * Timeline Training Settings of the ConceptOverTimeAnalysis.
   */
  training_settings: COTATrainingSettings;
  /**
   * List of Concepts that are part of the ConceptOverTimeAnalysis
   */
  concepts: Array<COTAConcept>;
  /**
   * List of Sentences that form the search space of the ConceptOverTimeAnalysis
   */
  search_space: Array<COTASentence>;
  /**
   * Created timestamp of the ConceptOverTimeAnalysis
   */
  created: string;
  /**
   * Updated timestamp of the ConceptOverTimeAnalysis
   */
  updated: string;
};
