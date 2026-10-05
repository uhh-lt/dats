/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ClassifierJobRead } from "./ClassifierJobRead";
import type { COTARefinementJobRead } from "./COTARefinementJobRead";
import type { CrawlerJobRead } from "./CrawlerJobRead";
import type { DuplicateFinderJobRead } from "./DuplicateFinderJobRead";
import type { ExportJobRead } from "./ExportJobRead";
import type { ImportJobRead } from "./ImportJobRead";
import type { LlmAssistantJobRead } from "./LlmAssistantJobRead";
import type { MlJobRead } from "./MlJobRead";
import type { PerspectivesJobRead } from "./PerspectivesJobRead";
export type JobUpdatedEvent = {
  type?: string;
  payload:
    | ClassifierJobRead
    | COTARefinementJobRead
    | CrawlerJobRead
    | DuplicateFinderJobRead
    | ExportJobRead
    | ImportJobRead
    | LlmAssistantJobRead
    | MlJobRead
    | PerspectivesJobRead;
};
