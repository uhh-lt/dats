import { useEffect } from "react";

/**
 * The shared CSS class applied to all token elements (`.tok`) that belong to a
 * highlighted span annotation. Tokens carry a `span-<id>` class per annotation
 * (see Token.tsx), so a span is highlighted by toggling this class on all
 * matching `.span-<id>` elements.
 */
export const SPAN_HIGHLIGHT_CLASS = "span-highlighted";

const spanClass = (annotationId: number) => `span-${annotationId}`;

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
      document.querySelectorAll(`.${spanClass(id)}.${SPAN_HIGHLIGHT_CLASS}`).forEach((el) => {
        el.classList.remove(SPAN_HIGHLIGHT_CLASS);
      });
    } else {
      highlightRefCount.set(id, count);
    }
  });
};

/**
 * Imperatively highlights all tokens of the given span annotation(s) by toggling
 * the shared highlight class on their `.span-<id>` elements. Tokens are rendered
 * via `html-react-parser` and may cross virtualization boundaries, so
 * `querySelectorAll` is used instead of React refs.
 *
 * Additive and reference-counted: independent highlights (e.g. "selected" and
 * "hovered") coexist without clearing each other, even for the same id. Retries
 * on an interval until a token mounts (virtualization).
 *
 * @param annotationIds - the span annotation id(s) to highlight (empty/undefined to highlight nothing).
 */
export function useSpanAnnotationHighlight(...annotationIds: (number | undefined | null)[]) {
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
        const elements = document.querySelectorAll(`.${spanClass(id)}`);
        elements.forEach((el) => el.classList.add(SPAN_HIGHLIGHT_CLASS));
        if (elements.length > 0) {
          found = true;
        }
      });
      return found;
    };

    // apply immediately; if no token is mounted yet (virtualization), retry
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
