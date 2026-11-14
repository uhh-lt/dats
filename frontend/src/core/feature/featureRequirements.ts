/** The features a feature requires, directly or transitively. */
function requiredFeatures(feature: string, requires: ReadonlyMap<string, readonly string[]>): Set<string> {
  const result = new Set<string>();
  const todo = [...(requires.get(feature) ?? [])];
  while (todo.length > 0) {
    const next = todo.pop();
    if (next === undefined || result.has(next)) continue;
    result.add(next);
    todo.push(...(requires.get(next) ?? []));
  }
  return result;
}

/** Selecting a feature selects the features it requires; the result keeps the order of `order` (the backend list). */
export function selectFeature(
  selected: readonly string[],
  feature: string,
  requires: ReadonlyMap<string, readonly string[]>,
  order: readonly string[],
): string[] {
  const result = new Set([...selected, feature, ...requiredFeatures(feature, requires)]);
  return order.filter((f) => result.has(f));
}

/** Deselecting a feature deselects the features that need it. */
export function deselectFeature(
  selected: readonly string[],
  feature: string,
  requires: ReadonlyMap<string, readonly string[]>,
): string[] {
  return selected.filter((f) => f !== feature && !requiredFeatures(f, requires).has(feature));
}

/** The enabled features that need this feature (directly or transitively). */
export function featuresRequiring(
  enabled: readonly string[],
  feature: string,
  requires: ReadonlyMap<string, readonly string[]>,
): string[] {
  return enabled.filter((f) => f !== feature && requiredFeatures(f, requires).has(feature));
}
