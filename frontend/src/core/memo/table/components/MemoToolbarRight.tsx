import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import { useMemo } from "react";
import { ElasticSearchHit } from "../../../../api/openapi/models/ElasticSearchHit.ts";
import { ExportMemosButton } from "../../../../components/Export/ExportMemosButton.tsx";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";

export function MemoToolbarRight({ table, selectedData }: FilterTableToolbarProps<ElasticSearchHit>) {
  const memoIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <ExportMemosButton memoIds={memoIds} />
    </Stack>
  );
}
