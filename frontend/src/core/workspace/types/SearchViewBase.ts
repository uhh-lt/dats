/**
 * Minimal structural shape every search view satisfies, regardless of entity.
 * The generated per-entity view types (MemoSearchViewRead, SpanSearchViewRead, ...)
 * are all assignable to this.
 */
export interface SearchViewBase {
  id: number;
  project_id: number;
  position: number;
}
