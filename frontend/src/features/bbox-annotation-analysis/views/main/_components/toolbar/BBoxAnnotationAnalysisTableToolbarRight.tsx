import { BBoxAnnotationRow } from "@api/models/BBoxAnnotationRow";
import { FilterTableToolbarProps } from "@components/filter";
import { BBoxAnnotationExportButton } from "@core/bbox-annotation/BBoxAnnotationExportButton";
import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { useMemo } from "react";

export function BBoxAnnotationAnalysisTableToolbarRight({
  table,
  selectedData,
}: FilterTableToolbarProps<BBoxAnnotationRow>) {
  const bboxAnnotationIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <BBoxAnnotationExportButton bboxAnnotationIds={bboxAnnotationIds} />
    </Stack>
  );
}
