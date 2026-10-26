import { URLFilterPopover, URLFilterTableToolbarProps } from "@core/filter";
import { MemoRead } from "@models/MemoRead";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { MemoDeleteButton } from "../../MemoDeleteButton";
import { MemoFavoriteButton } from "../../MemoFavoriteButton";

export function MemoURLToolbarLeft({
  anchor,
  selectedData,
  routeApi,
  defaultFilterExpression,
  tableInfoOptions,
}: URLFilterTableToolbarProps<MemoRead>) {
  const selectedMemoIds = useMemo(() => selectedData.map((memo) => memo.id), [selectedData]);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterPopover
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        tableInfoOptions={tableInfoOptions}
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
