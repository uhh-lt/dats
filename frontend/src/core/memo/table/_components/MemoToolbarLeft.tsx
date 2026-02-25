import { FilterTableToolbarProps } from "@components/filter/index";
import { ReduxFilterDialog } from "@components/filter/redux-filter-dialog/index";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { ElasticSearchHit } from "../../../../api/openapi/models/ElasticSearchHit";
import { MemoDeleteButton } from "../../MemoDeleteButton";
import { MemoStarButton } from "../../MemoStarButton";

export function MemoToolbarLeft({
  anchor,
  selectedData,
  filterName,
  filterStateSelector,
  filterActions,
}: FilterTableToolbarProps<ElasticSearchHit>) {
  const selectedMemoIds = useMemo(() => selectedData.map((memo) => memo.id), [selectedData]);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={filterActions}
      />
      {selectedMemoIds.length > 0 && (
        <>
          <MemoDeleteButton memoIds={selectedMemoIds} />
          <MemoStarButton memoIds={selectedMemoIds} isStarred={true} />
          <MemoStarButton memoIds={selectedMemoIds} isStarred={false} />
        </>
      )}
    </Stack>
  );
}
