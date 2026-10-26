/**
 * The `onClose` of every MUI Dialog: it closes on Escape, never on a click on the backdrop, so a stray click does not
 * throw away the dialog's input. The X in the header calls `close` directly.
 */
export const closeOnEscape =
  (close: () => void) =>
  (_event: object, reason: "backdropClick" | "escapeKeyDown"): void => {
    if (reason === "escapeKeyDown") close();
  };
