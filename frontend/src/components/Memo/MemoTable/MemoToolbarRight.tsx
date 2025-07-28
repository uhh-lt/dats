import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import { useMemo } from "react";
import { ElasticSearchHit } from "../../../api/openapi/models/ElasticSearchHit.ts";
import ExportMemosButton from "../../Export/ExportMemosButton.tsx";
import { FilterTableToolbarProps } from "../../FilterTable/FilterTableToolbarProps.ts";

function MemoToolbarRight({ table, selectedData }: FilterTableToolbarProps<ElasticSearchHit>) {
  const memoIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportMemosButton memoIds={memoIds} />
    </Stack>
  );
}

export default MemoToolbarRight;
