/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { FolderRead } from "./FolderRead";
import type { HierarchicalElasticSearchHit } from "./HierarchicalElasticSearchHit";
import type { SourceDocumentRead } from "./SourceDocumentRead";
export type PaginatedSDocHits = {
  /**
   * The IDs, scores and (optional) highlights of Document search results on the requested page.
   */
  hits: Array<HierarchicalElasticSearchHit>;
  /**
   * A dictionary of sdoc_id and SourceDocumentRead.
   */
  sdocs: Record<string, SourceDocumentRead>;
  /**
   * A dictionary of folder_id and FolderRead.
   */
  sdoc_folders: Record<string, FolderRead>;
  /**
   * A dictionary of sdoc_id and a list of annotator user IDs that annotated the document.
   */
  annotators: Record<string, Array<number>>;
  /**
   * A dictionary of sdoc_id and a list of tag IDs that are associated with the document.
   */
  tags: Record<string, Array<number>>;
  /**
   * The total number of hits. Used for pagination.
   */
  total_results: number;
};
