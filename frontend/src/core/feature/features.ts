import { FeatureArea } from "@models/FeatureArea";
import { FeatureRead } from "@models/FeatureRead";

/**
 * The features the frontend has a page or a gate for, by their backend names. Their titles, descriptions and areas
 * come from the backend (`GET /feature`, `useFeatureInfo`); every other feature is known from that list only.
 */
export const Feature = {
  FULL_TEXT_SEARCH: "full_text_search",
  SEMANTIC_SEARCH: "semantic_search",
  RAG_CHAT: "rag_chat",
  KEYWORD_STATISTICS: "keyword_statistics",
  CONCEPTS_OVER_TIME: "concepts_over_time",
  WORD_FREQUENCY: "word_frequency",
  DUPLICATE_FINDER: "duplicate_finder",
  ANNOTATION_SCALING: "annotation_scaling",
  TAG_RECOMMENDATION: "tag_recommendation",
} as const;

/** A feature the frontend has a page or a gate for. */
export type FrontendFeature = (typeof Feature)[keyof typeof Feature];

const AREA_ORDER = Object.values(FeatureArea);

/**
 * Groups the features by area, in the order of `FeatureArea`, keeping the order of the backend list (area, then
 * title) within an area; for the feature selection and the Features tab.
 */
export function groupFeaturesByArea(features: readonly FeatureRead[]): { area: FeatureArea; items: FeatureRead[] }[] {
  return AREA_ORDER.map((area) => ({
    area,
    items: features.filter((feature) => feature.area === area),
  })).filter((group) => group.items.length > 0);
}
