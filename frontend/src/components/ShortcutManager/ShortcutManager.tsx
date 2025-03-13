import { useEffect } from "react";
import { useShortcuts } from "../../hooks/useShortcuts";

export function ShortcutManager() {
  const shortcuts = useShortcuts();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // First check for Cmd+W/Ctrl+W to prevent browser tab closing
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "w") {
        event.preventDefault();
      }

      // Shortcuts are already sorted by number of modifiers from useShortcuts hook
      for (const shortcut of shortcuts) {
        const { keys } = shortcut;

        if (
          keys.key.toLowerCase() === event.key.toLowerCase() &&
          (!keys.ctrlmeta || event.ctrlKey || event.metaKey) &&
          (!keys.shift || event.shiftKey) &&
          (!keys.alt || event.altKey)
        ) {
          event.preventDefault();
          shortcut.action();
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
