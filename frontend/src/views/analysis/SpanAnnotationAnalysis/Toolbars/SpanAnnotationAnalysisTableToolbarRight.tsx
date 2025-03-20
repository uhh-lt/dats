import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { SpanAnnotationRow } from "../../../../api/openapi/models/SpanAnnotationRow.ts";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";
import ExportSpanAnnotationsButton from "./ExportSpanAnnotationsButton.tsx";

function SpanAnnotationsTableToolbarRight({ table, selectedData }: FilterTableToolbarProps<SpanAnnotationRow>) {
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportSpanAnnotationsButton spanAnnotationIds={selectedData.map((a) => a.id)} />
    </Stack>
  );
}

export default SpanAnnotationsTableToolbarRight;
