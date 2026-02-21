import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { useMemo } from "react";
import { SpanAnnotationRow } from "../../../../api/openapi/models/SpanAnnotationRow.ts";
import { ExportSpanAnnotationsButton } from "../../../../components/Export/ExportSpanAnnotationsButton.tsx";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";

export function SpanAnnotationsTableToolbarRight({ table, selectedData }: FilterTableToolbarProps<SpanAnnotationRow>) {
  const spanAnnotationIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportSpanAnnotationsButton spanAnnotationIds={spanAnnotationIds} />
    </Stack>
  );
}
