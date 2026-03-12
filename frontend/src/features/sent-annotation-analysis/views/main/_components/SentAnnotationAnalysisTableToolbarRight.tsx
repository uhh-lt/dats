import { SentenceAnnotationRow } from "@api/models/SentenceAnnotationRow";
import { FilterTableToolbarProps } from "@core/filter";
import { SentenceAnnotationExportButton } from "@core/sentence-annotation";
import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { useMemo } from "react";

export function SentAnnotationAnalysisTableToolbarRight({
  table,
  selectedData,
}: FilterTableToolbarProps<SentenceAnnotationRow>) {
  const sentAnnotationIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <SentenceAnnotationExportButton sentenceAnnotationIds={sentAnnotationIds} />
    </Stack>
  );
}
