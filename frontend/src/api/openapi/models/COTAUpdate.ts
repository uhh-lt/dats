/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { COTAConcept } from "./COTAConcept";
import type { COTATimelineSettings } from "./COTATimelineSettings";
import type { COTATrainingSettings } from "./COTATrainingSettings";
export type COTAUpdate = {
  /**
   * Name of the ConceptOverTimeAnalysis
   */
  name?: string | null;
  /**
   * Timeline Settings of the ConceptOverTimeAnalysis.
   */
  timeline_settings?: COTATimelineSettings | null;
  /**
   * Training Settings of the ConceptOverTimeAnalysis.
   */
  training_settings?: COTATrainingSettings | null;
  /**
   * List of Concepts that are part of the ConceptOverTimeAnalysis
   */
  concepts?: Array<COTAConcept> | null;
};
