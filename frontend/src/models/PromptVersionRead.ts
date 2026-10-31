/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromptCode } from "./PromptCode";
import type { PromptMetadataField } from "./PromptMetadataField";
import type { PromptSettings } from "./PromptSettings";
import type { PromptTag } from "./PromptTag";
import type { SentencePromptExample } from "./SentencePromptExample";
import type { SpanPromptExample } from "./SpanPromptExample";
export type PromptVersionRead = {
  /**
   * The text of the prompt with its blocks
   */
  text: string;
  /**
   * Settings of the document and output format blocks
   */
  settings?: PromptSettings;
  /**
   * The codes of <codes> and <code_names>
   */
  codes?: Array<PromptCode>;
  /**
   * The few-shot examples of <examples>
   */
  examples?: Array<SpanPromptExample | SentencePromptExample>;
  /**
   * The tags of <tags>
   */
  tags?: Array<PromptTag>;
  /**
   * The metadata fields of <metadata_fields>
   */
  metadata_fields?: Array<PromptMetadataField>;
  /**
   * ID of the prompt version
   */
  id: number;
  /**
   * ID of the prompt the version belongs to
   */
  prompt_id: number;
  /**
   * Number of the version within its prompt (1, 2, 3, ...)
   */
  version: number;
  /**
   * ID of the user who saved the version
   */
  user_id: number | null;
  /**
   * Created timestamp of the version
   */
  created: string;
};
