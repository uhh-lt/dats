import { SxProps, Theme } from "@mui/material";

/**
 * Keeps a multiple Autocomplete in one row; combine it with limitTags={1}. The chip shrinks so that "+N more" stays
 * visible, and while the field is focused for typing, its chips are hidden instead of wrapping.
 */
export const oneRowChipsAutocompleteSx: SxProps<Theme> = {
  "& .MuiAutocomplete-inputRoot": { flexWrap: "nowrap" },
  "& .MuiAutocomplete-tag": { flexShrink: 0 },
  "& .MuiAutocomplete-tag.MuiChip-root": { flexShrink: 1, minWidth: 0 },
  // the input takes room only while typing
  "&:not(.Mui-focused) .MuiAutocomplete-inputRoot .MuiAutocomplete-input": { minWidth: 0, padding: 0 },
  "&.Mui-focused .MuiAutocomplete-tag": { display: "none" },
};
