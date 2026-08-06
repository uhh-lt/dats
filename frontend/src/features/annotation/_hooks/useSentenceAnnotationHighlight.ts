import { useEffect } from "react";

/**
 * The shared CSS class applied to all sentence elements that belong to a
 * highlighted sentence annotation. Sentences carry a `data-annotation-ids`
 * attribute containing space-separated annotation IDs, so a sentence annotation
 * is highlighted by toggling this class on all matching elements.
 */
export const SENTENCE_ANNOTATION_HIGHLIGHT_CLASS = "sentence-annotation-highlighted";

/**
 * Reference count per annotation id. Multiple independent hook instances (e.g. a
 * persistent "selected" highlight and a transient "hovered" highlight) can target
 * the same annotation; the shared class is only removed once the last owner
 * releases it. Counts are incremented once per effect-run (not per retry), so
 * retries never inflate the count, and decremented exactly once in cleanup.
 */
const highlightRefCount = new Map<number, number>();

const increment = (ids: number[]) => {
  ids.forEach((id) => highlightRefCount.set(id, (highlightRefCount.get(id) ?? 0) + 1));
};

const decrement = (ids: number[]) => {
  ids.forEach((id) => {
    const count = (highlightRefCount.get(id) ?? 0) - 1;
    if (count <= 0) {
      highlightRefCount.delete(id);
      // last owner released this id -> actually remove the highlight
      document
        .querySelectorAll(`[data-annotation-ids~="${id}"].${SENTENCE_ANNOTATION_HIGHLIGHT_CLASS}`)
        .forEach((el) => {
          el.classList.remove(SENTENCE_ANNOTATION_HIGHLIGHT_CLASS);
        });
    } else {
      highlightRefCount.set(id, count);
    }
  });
};

/**
 * Imperatively highlights all sentences of the given sentence annotation(s) by
 * toggling the shared highlight class on their `[data-annotation-ids]` elements.
 * Sentences may be virtualized and mount after the id is set, so the highlight
 * is retried on an interval until a matching element is found.
 *
 * Additive and reference-counted: independent highlights (e.g. "selected" and
 * "hovered") coexist without clearing each other, even for the same id.
 *
 * @param annotationIds - the sentence annotation id(s) to highlight (empty/undefined to highlight nothing).
 */
export function useSentenceAnnotationHighlight(...annotationIds: (number | undefined | null)[]) {
  // stable key so the effect re-runs when the set of ids changes
  const key = annotationIds.filter((id) => id !== undefined && id !== null).join(",");
  useEffect(() => {
    const ids = key === "" ? [] : key.split(",").map((s) => parseInt(s));
    if (ids.length === 0) {
      return;
    }

    // claim ownership of these ids exactly once for this effect-run
    increment(ids);

    const apply = () => {
      let found = false;
      ids.forEach((id) => {
        const elements = document.querySelectorAll(`[data-annotation-ids~="${id}"]`);
        elements.forEach((el) => el.classList.add(SENTENCE_ANNOTATION_HIGHLIGHT_CLASS));
        if (elements.length > 0) {
          found = true;
        }
      });
      return found;
    };

    // apply immediately; if no sentence is mounted yet (virtualization), retry
    if (!apply()) {
      const intervalHandle = setInterval(() => {
        if (apply()) {
          clearInterval(intervalHandle);
        }
      }, 300);
      return () => {
        clearInterval(intervalHandle);
        decrement(ids);
      };
    }

    return () => decrement(ids);
  }, [key]);
}
