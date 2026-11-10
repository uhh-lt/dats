import { useEffect, useRef } from "react";
import { useShortcuts } from "./_hooks/useShortcuts";

/** How long after a shortcut its chord keys are accepted. */
const CHORD_TIMEOUT_MS = 1500;
const MODIFIER_KEYS = new Set(["Shift", "Control", "Meta", "Alt"]);

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

export function ShortcutManager() {
  const shortcuts = useShortcuts();
  // the last shortcut key and when it was pressed, to resolve a following chord key
  const lastShortcutRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // pressing or releasing the modifiers of a shortcut must not end a chord
      if (MODIFIER_KEYS.has(event.key)) return;

      // the second key of a chord: a plain key shortly after a shortcut, never while typing
      const lastShortcut = lastShortcutRef.current;
      lastShortcutRef.current = null;
      if (
        lastShortcut &&
        Date.now() - lastShortcut.time < CHORD_TIMEOUT_MS &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        !isEditable(event.target)
      ) {
        const chord = shortcuts.find(
          (shortcut) => shortcut.then === event.key.toLowerCase() && shortcut.keys.key === lastShortcut.key,
        );
        if (chord) {
          event.preventDefault();
          chord.action();
          return;
        }
      }

      // Shortcuts are already sorted by number of modifiers from useShortcuts hook
      for (const shortcut of shortcuts) {
        if (shortcut.then) continue;
        const { keys } = shortcut;

        if (
          keys.key.toLowerCase() === event.key.toLowerCase() &&
          (!keys.ctrlmeta || event.ctrlKey || event.metaKey) &&
          (!keys.shift || event.shiftKey) &&
          (!keys.alt || event.altKey)
        ) {
          event.preventDefault();
          shortcut.action();
          lastShortcutRef.current = { key: keys.key, time: Date.now() };
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);

  // This component doesn't render anything
  return null;
}
