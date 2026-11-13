import { Feature } from "@models/Feature";

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
