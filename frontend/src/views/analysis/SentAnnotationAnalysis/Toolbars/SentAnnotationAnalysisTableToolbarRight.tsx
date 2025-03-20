import { Stack } from "@mui/material";
import {
  MRT_ShowHideColumnsButton,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
} from "material-react-table";
import { SentenceAnnotationRow } from "../../../../api/openapi/models/SentenceAnnotationRow.ts";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";
import ExportSentAnnotationsButton from "./ExportSentAnnotationsButton.tsx";

function SentAnnotationsTableToolbarRight({ table, selectedData }: FilterTableToolbarProps<SentenceAnnotationRow>) {
  return (
    <Stack direction="row" spacing={1}>
      <MRT_ToggleGlobalFilterButton table={table} />
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportSentAnnotationsButton sentAnnotationIds={selectedData.map((a) => a.id)} />
    </Stack>
  );
}

export default SentAnnotationsTableToolbarRight;
