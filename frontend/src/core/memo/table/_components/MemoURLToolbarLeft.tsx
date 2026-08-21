import { URLFilterDialog, URLFilterTableToolbarProps } from "@core/filter";
import { MemoRow } from "@models/MemoRow";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { MemoDeleteButton } from "../../MemoDeleteButton";
import { MemoFavoriteButton } from "../../MemoFavoriteButton";

export function MemoURLToolbarLeft({
  anchor,
  selectedData,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
}: URLFilterTableToolbarProps<MemoRow>) {
  const selectedMemoIds = useMemo(() => selectedData.map((memo) => memo.id), [selectedData]);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        column2InfoSelector={column2InfoSelector}
      />
      {selectedMemoIds.length > 0 && (
        <>
          <MemoDeleteButton memoIds={selectedMemoIds} />
          <MemoFavoriteButton memoIds={selectedMemoIds} isFavorite={true} />
          <MemoFavoriteButton memoIds={selectedMemoIds} isFavorite={false} />
        </>
      )}
    </Stack>
  );
}
