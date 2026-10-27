/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The filled system and user prompt of one message of one document.
 */
export type LLMAssistantPromptPreview = {
  /**
   * ID of the rendered source document
   */
  sdoc_id: number;
  /**
   * Language of the document and of the prompts
   */
  language: string;
  /**
   * Index of the rendered message (sentence or chunk) within the document
   */
  message_index: number;
  /**
   * Number of messages (sentences or chunks) the document is split into
   */
  num_messages: number;
  /**
   * The filled system prompt
   */
  system_prompt: string;
  /**
   * The filled user prompt
   */
  user_prompt: string;
};
