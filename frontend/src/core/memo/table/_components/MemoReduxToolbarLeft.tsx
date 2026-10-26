import { ReduxFilterPopover, ReduxFilterTableToolbarProps } from "@core/filter";
import { MemoRead } from "@models/MemoRead";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { MemoDeleteButton } from "../../MemoDeleteButton";
import { MemoFavoriteButton } from "../../MemoFavoriteButton";

export function MemoReduxToolbarLeft({
  anchor,
  selectedData,
  filterName,
  filterStateSelector,
  filterActions,
  tableInfoOptions,
}: ReduxFilterTableToolbarProps<MemoRead>) {
  const selectedMemoIds = useMemo(() => selectedData.map((memo) => memo.id), [selectedData]);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterPopover
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterStateSelector={filterStateSelector}
        filterActions={filterActions}
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
