import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import ExporterButton from "../../Exporter/ExporterButton.tsx";
import { FilterTableToolbarProps } from "../../FilterTable/FilterTableToolbarProps.ts";

function MemoToolbarRight({ table }: FilterTableToolbarProps<ElasticSearchDocumentHit>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExporterButton
        tooltip="Export memos"
        exporterInfo={{ type: "Memos", singleUser: true, users: [], sdocId: -1 }}
      />
    </Stack>
  );
}

export default MemoToolbarRight;
