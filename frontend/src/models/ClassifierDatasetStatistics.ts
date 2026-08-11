/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierClassStatistics } from "./ClassifierClassStatistics";
import type { ClassifierSignalStrength } from "./ClassifierSignalStrength";
import type { ProblematicSdoc } from "./ProblematicSdoc";
export type ClassifierDatasetStatistics = {
  /**
   * Total number of units (tokens / sentences / documents) in the dataset
   */
  total_units: number;
  /**
   * Number of units with a non-O label in the dataset
   */
  labeled_units: number;
  /**
   * Percentage of labeled units relative to all units (training signal)
   */
  signal_percentage: number;
  /**
   * Strength of the training signal derived from the signal percentage
   */
  signal_strength: ClassifierSignalStrength;
  /**
   * Signal percentage below which the training signal is considered weak
   */
  weak_signal_threshold: number;
  /**
   * Signal percentage above which the training signal is considered strong
   */
  strong_signal_threshold: number;
  /**
   * Statistics per class (tag or code)
   */
  classes: Array<ClassifierClassStatistics>;
  /**
   * Documents with a low share of labeled units, sorted by severity
   */
  problematic_sdocs: Array<ProblematicSdoc>;
  /**
   * IDs of tag-selected documents without a matching selected class. Span and sentence datasets exclude them; document datasets retain them as O examples
   */
  unannotated_sdocs: Array<number>;
};
