import { Icon } from "@components/icons";
import type { RegisteredRouter } from "@tanstack/react-router";

/**
 * User-facing features that a project can enable or disable.
 * The values are meant to match the backend `Feature` enum 1:1 once it exists.
 */
export enum Feature {
  IMAGE_SIMILARITY_SEARCH = "image_similarity_search",
  SENTENCE_SIMILARITY_SEARCH = "sentence_similarity_search",
  PERSPECTIVES = "perspectives",
  CLASSIFIER = "classifier",
  LLM_ASSISTANT = "llm_assistant",
  EXPERIMENTS = "experiments",
  CODE_FREQUENCY = "code_frequency",
  AGREEMENT = "agreement",
  TIMELINE = "timeline",
  ANNOTATION_TABLES = "annotation_tables",
  WORD_FREQUENCY = "word_frequency",
  CONCEPTS_OVER_TIME = "concepts_over_time",
  ANNOTATION_SCALING = "annotation_scaling",
  TAG_RECOMMENDATION = "tag_recommendation",
  DUPLICATE_FINDER = "duplicate_finder",
  DOCUMENT_SAMPLER = "document_sampler",
}

/** Where an entry appears: the sidebar search menu, the sidebar, the analysis dashboard or the sidebar tools menu. */
export type FeatureGroup = "search" | "main" | "analysis" | "tools";

export type FeatureCommandCategory = "Navigation" | "Analysis" | "Tools";

export type FeatureRoute = Extract<
  RegisteredRouter["routeTree"]["types"]["fileRouteTypes"]["to"],
  `/project/$projectId/${string}`
>;

export interface FeatureEntry {
  /** Stable id of the navigation entry. */
  id: string;
  /** The feature this entry belongs to; entries without one are never gated. */
  feature?: Feature;
  group: FeatureGroup;
  title: string;
  /** Shown on the analysis dashboard card. */
  description?: string;
  icon: Icon;
  to: FeatureRoute;
  /** Key of the ⌘⇧ navigation shortcut. */
  shortcut?: string;
  /** Sidebar tooltip, if it differs from the title. */
  sidebarTooltip?: string;
  /** Quick command menu entry; entries without one are not in the menu. */
  command?: {
    title?: string;
    description: string;
    keywords: readonly string[];
    /** Defaults to the category of the entry's group. */
    category?: FeatureCommandCategory;
  };
}
