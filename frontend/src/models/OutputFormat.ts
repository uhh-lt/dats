/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * The answer format the LLM must follow, chosen with <output-format:format>.
 *
 * The format decides the fixed answer instructions of the prompt, the structured
 * output schema and how the answers are parsed.
 */
export enum OutputFormat {
  INLINE = "inline",
  CONTEXT = "context",
  SENTENCES = "sentences",
  TAGS = "tags",
  METADATA = "metadata",
}
