import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { useMemo } from "react";
import { BBoxAnnotationRow } from "../../../../api/openapi/models/BBoxAnnotationRow.ts";
import ExportBBoxAnnotationsButton from "../../../../components/Export/ExportBBoxAnnotationsButton.tsx";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";

function BBoxAnnotationsTableToolbarRight({ table, selectedData }: FilterTableToolbarProps<BBoxAnnotationRow>) {
  const bboxAnnotationIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportBBoxAnnotationsButton bboxAnnotationIds={bboxAnnotationIds} />
    </Stack>
  );
}

export default BBoxAnnotationsTableToolbarRight;
