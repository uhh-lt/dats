import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import { WordFrequencyExportButton } from "./WordFrequencyExportButton";
import { WordFrequencyTableToolbarProps } from "./WordFrequencyTableToolbarProps";

export function WordFrequencyTableToolbarRight({ table, filter }: WordFrequencyTableToolbarProps) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <WordFrequencyExportButton filter={filter} />
    </Stack>
  );
}
