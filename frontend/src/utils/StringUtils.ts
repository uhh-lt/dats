/**
 * Formats an enum/constant value (e.g. `attached_object_type`, `table`) into a
 * human-readable label (`Attached object type`, `Table`).
 */
export const formatOptionLabel = (value: string) => {
  const label = value.replaceAll("_", " ");
  return `${label[0].toUpperCase()}${label.slice(1)}`;
};
