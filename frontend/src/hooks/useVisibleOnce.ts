import { useEffect, useRef, useState } from "react";

/**
 * Tracks whether an element is (or has been) visible in the viewport using an
 * IntersectionObserver. Once visible, stays visible (latch) so lazy-fetched content is not
 * re-fetched / hidden when scrolled back out. Returns a ref to attach to the element and a
 * boolean that flips to true the first time the element intersects.
 */
export function useVisibleOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || hasBeenVisible) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setHasBeenVisible(true);
        observer.disconnect();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasBeenVisible]);

  return { ref, hasBeenVisible };
}
