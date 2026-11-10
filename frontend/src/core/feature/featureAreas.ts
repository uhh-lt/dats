import { Feature } from "@models/Feature";

export interface FeatureArea {
  title: string;
  features: readonly Feature[];
}

/** The toggleable features grouped by what users do with them, for the feature selection and the Features tab. */
export const FEATURE_AREAS: readonly FeatureArea[] = [
  {
    title: "Search",
    features: [
      Feature.FULL_TEXT_SEARCH,
      Feature.SEARCH_ANNOTATE,
      Feature.SENTENCE_SIMILARITY_SEARCH,
      Feature.IMAGE_SIMILARITY_SEARCH,
    ],
  },
  {
    title: "Analysis",
    features: [
      Feature.RAG_CHAT,
      Feature.CONCEPTS_OVER_TIME,
      Feature.WORD_FREQUENCY,
      Feature.KEYWORD_STATISTICS,
      Feature.DUPLICATE_FINDER,
    ],
  },
  {
    title: "Automatic annotation",
    features: [
      Feature.ANNOTATION_SCALING,
      Feature.TAG_RECOMMENDATION,
      Feature.ENTITY_ANNOTATIONS,
      Feature.IMAGE_CAPTIONS,
      Feature.OBJECT_DETECTION,
    ],
  },
];

/** The area of every feature; features missing in `FEATURE_AREAS` (a new backend feature) are listed under "Other". */
export function groupFeaturesByArea<T extends { feature: Feature }>(
  items: readonly T[],
): { title: string; items: T[] }[] {
  const areas = FEATURE_AREAS.map((area) => ({
    title: area.title,
    items: area.features.flatMap((f) => items.filter((item) => item.feature === f)),
  }));
  const known = new Set(FEATURE_AREAS.flatMap((area) => area.features));
  const other = items.filter((item) => !known.has(item.feature));
  if (other.length > 0) areas.push({ title: "Other", items: other });
  return areas.filter((area) => area.items.length > 0);
}

/** The features a feature requires, directly or transitively. */
function requiredFeatures(feature: Feature, requires: ReadonlyMap<Feature, readonly Feature[]>): Set<Feature> {
  const result = new Set<Feature>();
  const todo = [...(requires.get(feature) ?? [])];
  while (todo.length > 0) {
    const next = todo.pop();
    if (next === undefined || result.has(next)) continue;
    result.add(next);
    todo.push(...(requires.get(next) ?? []));
  }
  return result;
}

/** Selecting a feature selects the features it requires. */
export function selectFeature(
  selected: readonly Feature[],
  feature: Feature,
  requires: ReadonlyMap<Feature, readonly Feature[]>,
): Feature[] {
  const result = new Set([...selected, feature, ...requiredFeatures(feature, requires)]);
  return Object.values(Feature).filter((f) => result.has(f));
}

/** Deselecting a feature deselects the features that need it. */
export function deselectFeature(
  selected: readonly Feature[],
  feature: Feature,
  requires: ReadonlyMap<Feature, readonly Feature[]>,
): Feature[] {
  return selected.filter((f) => f !== feature && !requiredFeatures(f, requires).has(feature));
}

/** The enabled features that need this feature (directly or transitively). */
export function featuresRequiring(
  enabled: readonly Feature[],
  feature: Feature,
  requires: ReadonlyMap<Feature, readonly Feature[]>,
): Feature[] {
  return enabled.filter((f) => f !== feature && requiredFeatures(f, requires).has(feature));
}
