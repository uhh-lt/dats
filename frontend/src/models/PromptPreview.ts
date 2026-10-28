/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { RenderedPromptBlock } from "./RenderedPromptBlock";
/**
 * The rendered prompt of one message of one document.
 */
export type PromptPreview = {
  /**
   * ID of the rendered source document
   */
  sdoc_id: number | null;
  /**
   * Index of the rendered message (sentence or chunk) of the document
   */
  message_index: number;
  /**
   * Number of messages (LLM calls) the document is split into, 0 without a document
   */
  num_messages: number;
  /**
   * The rendered prompt
   */
  prompt: string;
  /**
   * The text of every block of the prompt except the document
   */
  blocks: Array<RenderedPromptBlock>;
  /**
   * The prompt shows few-shot examples, so a run is few-shot
   */
  is_fewshot: boolean;
  /**
   * Placeholder-like tags (e.g. <code>) that are sent to the LLM verbatim because no block fills them
   */
  unknown_placeholders: Array<string>;
};
