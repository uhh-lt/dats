/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Bytes already at the provider, named by a handle the provider issued: an
 * OpenAI or Anthropic file id, a Gemini file URI, a storage URL only that
 * provider can read. No bytes travel and nothing is fetched. Only the
 * provider that minted the handle can resolve it; a peer that cannot drops
 * the part as it drops any part it cannot use.
 */
export type FileSource = Record<string, any>;
