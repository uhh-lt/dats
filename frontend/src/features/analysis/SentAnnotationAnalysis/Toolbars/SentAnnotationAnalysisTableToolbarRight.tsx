import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { useMemo } from "react";
import { SentenceAnnotationRow } from "../../../../api/openapi/models/SentenceAnnotationRow.ts";
import { ExportSentenceAnnotationsButton } from "../../../../components/Export/ExportSentenceAnnotationsButton.tsx";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";

export function SentAnnotationsTableToolbarRight({ table, selectedData }: FilterTableToolbarProps<SentenceAnnotationRow>) {
  const sentAnnotationIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportSentenceAnnotationsButton sentenceAnnotationIds={sentAnnotationIds} />
    </Stack>
  );
}
