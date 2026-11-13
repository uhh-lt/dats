import { useEffect, useRef } from "react";
import { Shortcut, useShortcuts } from "./_hooks/useShortcuts";

/** How long after a shortcut its chord keys are accepted; a shortcut that leads chords runs its own action after it. */
const CHORD_TIMEOUT_MS = 1500;
const MODIFIER_KEYS = new Set(["Shift", "Control", "Meta", "Alt"]);

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

type Modifiers = Pick<KeyboardEvent, "ctrlKey" | "metaKey" | "shiftKey" | "altKey">;

/** The shortcut's modifiers are pressed, and no other. */
function matchesModifiers(shortcut: Shortcut, event: Modifiers): boolean {
  const { keys } = shortcut;
  return (
    Boolean(keys.ctrlmeta) === (event.ctrlKey || event.metaKey) &&
    Boolean(keys.shift) === event.shiftKey &&
    Boolean(keys.alt) === event.altKey
  );
}

export function ShortcutManager() {
  const shortcuts = useShortcuts();
  // a shortcut that leads chords: its own action waits until the chord timeout passes without a chord key
  const pendingRef = useRef<{
    shortcut: Shortcut;
    modifiers: Modifiers;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // pressing or releasing the modifiers of a shortcut must not end a chord
      if (MODIFIER_KEYS.has(event.key)) return;

      // the second key of a chord: a plain key shortly after its leader, never while typing; any other key runs the
      // leader's own action first
      const pending = pendingRef.current;
      if (pending) {
        clearTimeout(pending.timer);
        pendingRef.current = null;
        const isPlainKey = !event.ctrlKey && !event.metaKey && !event.altKey && !isEditable(event.target);
        const chord = isPlainKey
          ? shortcuts.find(
              (shortcut) =>
                shortcut.then === event.key.toLowerCase() &&
                shortcut.keys.key === pending.shortcut.keys.key &&
                matchesModifiers(shortcut, pending.modifiers),
            )
          : undefined;
        if (chord) {
          event.preventDefault();
          chord.action();
          return;
        }
        pending.shortcut.action();
      }

      const shortcut = shortcuts.find(
        (s) => !s.then && s.keys.key.toLowerCase() === event.key.toLowerCase() && matchesModifiers(s, event),
      );
      if (!shortcut) return;
      event.preventDefault();
      const leadsChords = shortcuts.some(
        (s) => s.then && s.keys.key.toLowerCase() === shortcut.keys.key.toLowerCase() && matchesModifiers(s, event),
      );
      if (!leadsChords) {
        shortcut.action();
        return;
      }
      pendingRef.current = {
        shortcut,
        modifiers: { ctrlKey: event.ctrlKey, metaKey: event.metaKey, shiftKey: event.shiftKey, altKey: event.altKey },
        timer: setTimeout(() => {
          pendingRef.current = null;
          shortcut.action();
        }, CHORD_TIMEOUT_MS),
      };
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (pendingRef.current) clearTimeout(pendingRef.current.timer);
      pendingRef.current = null;
    };
  }, [shortcuts]);

  // This component doesn't render anything
  return null;
}
