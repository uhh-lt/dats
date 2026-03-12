import { ElasticSearchHit } from "@api/models/ElasticSearchHit";
import { FilterTableToolbarProps } from "@core/filter";
import { Stack } from "@mui/material";
import { MRT_ShowHideColumnsButton, MRT_ToggleDensePaddingButton } from "material-react-table";
import { useMemo } from "react";
import { MemosExportButton } from "../../MemoExportButton";

export function MemoToolbarRight({ table, selectedData }: FilterTableToolbarProps<ElasticSearchHit>) {
  const memoIds = useMemo(() => selectedData.map((a) => a.id), [selectedData]);
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <MRT_ShowHideColumnsButton table={table} />
      <MRT_ToggleDensePaddingButton table={table} />
      <MemosExportButton memoIds={memoIds} />
    </Stack>
  );
}
