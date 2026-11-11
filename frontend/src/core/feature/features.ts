import { Feature } from "@models/Feature";

/** What users do with a feature; groups the features in the feature selection and the Features tab. */
export type FeatureArea = "Search" | "Analysis" | "Automatic Annotation";

export interface FeatureInfo {
  /** The one title of the feature, also of its page (sidebar, analysis dashboard, commands, shortcuts, tab). */
  title: string;
  description: string;
  area: FeatureArea;
}

const FEATURE_AREA_ORDER: readonly FeatureArea[] = ["Search", "Analysis", "Automatic Annotation"];

/** The display text and area of every toggleable feature, in display order within an area. */
export const FEATURES: Record<Feature, FeatureInfo> = {
  [Feature.FULL_TEXT_SEARCH]: {
    title: "Full-Text Search",
    description:
      "Search the text of the documents with keywords and phrases. Without it, documents can still be searched with filters.",
    area: "Search",
  },
  [Feature.SEARCH_ANNOTATE]: {
    title: "Search & Auto-Annotate",
    description: "Search a phrase in all documents and annotate the matches at once.",
    area: "Search",
  },
  [Feature.SENTENCE_SIMILARITY_SEARCH]: {
    title: "Sentence Search",
    description: "Find sentences that are similar in meaning.",
    area: "Search",
  },
  [Feature.IMAGE_SIMILARITY_SEARCH]: {
    title: "Image Search",
    description: "Find images that are similar to a text or another image.",
    area: "Search",
  },
  [Feature.RAG_CHAT]: {
    title: "RAG Chat",
    description: "Ask questions about the documents; the answers cite the most similar sentences.",
    area: "Analysis",
  },
  [Feature.CONCEPTS_OVER_TIME]: {
    title: "Concepts Over Time Analysis",
    description: "Track how often concepts, described by example sentences, occur over time.",
    area: "Analysis",
  },
  [Feature.WORD_FREQUENCY]: {
    title: "Word Frequency Analysis",
    description: "Count and compare the words of the documents.",
    area: "Analysis",
  },
  [Feature.KEYWORD_STATISTICS]: {
    title: "Keyword Statistics and Filter",
    description: "Extract the keywords of each document, to count them and filter documents by them.",
    area: "Analysis",
  },
  [Feature.DUPLICATE_FINDER]: {
    title: "Duplicate Finder",
    description: "Find documents with (almost) the same words.",
    area: "Analysis",
  },
  [Feature.ANNOTATION_SCALING]: {
    title: "Annotation Scaling",
    description: "Get suggestions for sentences similar to the ones you annotated and accept or reject them.",
    area: "Automatic Annotation",
  },
  [Feature.TAG_RECOMMENDATION]: {
    title: "Tag Recommendations",
    description: "Get tag suggestions for untagged documents based on similar tagged documents.",
    area: "Automatic Annotation",
  },
  [Feature.ENTITY_ANNOTATIONS]: {
    title: "Automatic Entity Annotations",
    description: "Annotate named entities (persons, organizations, places, ...) in all text automatically.",
    area: "Automatic Annotation",
  },
  [Feature.IMAGE_CAPTIONS]: {
    title: "Image Captions",
    description:
      "Describe every image with a generated caption, which makes the images searchable and annotatable as text.",
    area: "Automatic Annotation",
  },
  [Feature.OBJECT_DETECTION]: {
    title: "Automatic Object Detection",
    description: "Annotate the objects in all images automatically with bounding boxes.",
    area: "Automatic Annotation",
  },
};

const FEATURE_ORDER = Object.keys(FEATURES);

/** Groups items of features by area (in `FEATURES` order), for the feature selection and the Features tab. */
export function groupFeaturesByArea<T extends { feature: Feature }>(
  items: readonly T[],
): { area: FeatureArea; items: T[] }[] {
  const sorted = [...items].sort((a, b) => FEATURE_ORDER.indexOf(a.feature) - FEATURE_ORDER.indexOf(b.feature));
  return FEATURE_AREA_ORDER.map((area) => ({
    area,
    items: sorted.filter((item) => FEATURES[item.feature].area === area),
  })).filter((group) => group.items.length > 0);
}
