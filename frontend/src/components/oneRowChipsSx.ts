import { SxProps, Theme } from "@mui/material";

/** Keeps the chips and the input of an Autocomplete in one row; pass it as sx while values are selected. */
export const oneRowChipsAutocompleteSx: SxProps<Theme> = {
  "& .MuiAutocomplete-inputRoot": { flexWrap: "nowrap" },
  // the input takes no room until the field is focused for typing
  "& .MuiAutocomplete-inputRoot .MuiAutocomplete-input": { flex: "0 0 auto", width: 8, minWidth: 8 },
  "&.Mui-focused .MuiAutocomplete-inputRoot .MuiAutocomplete-input": { width: 80, minWidth: 80 },
};
