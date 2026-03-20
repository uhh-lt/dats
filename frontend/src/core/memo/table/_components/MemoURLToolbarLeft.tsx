import { ElasticSearchHit } from "@api/models/ElasticSearchHit";
import { URLFilterDialog, URLFilterTableToolbarProps } from "@core/filter";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { MemoDeleteButton } from "../../MemoDeleteButton";
import { MemoStarButton } from "../../MemoStarButton";

export function MemoURLToolbarLeft({
  anchor,
  selectedData,
  filterName,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
  filterSearchParam,
  expertModeSearchParam,
}: URLFilterTableToolbarProps<ElasticSearchHit>) {
  const selectedMemoIds = useMemo(() => selectedData.map((memo) => memo.id), [selectedData]);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        column2InfoSelector={column2InfoSelector}
        filterSearchParam={filterSearchParam}
        expertModeSearchParam={expertModeSearchParam}
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
