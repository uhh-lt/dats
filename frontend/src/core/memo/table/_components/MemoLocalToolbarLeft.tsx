import { FilterPopover, LocalFilterTableToolbarProps } from "@core/filter";
import { MemoColumns } from "@models/MemoColumns";
import { MemoRead } from "@models/MemoRead";
import { Stack } from "@mui/material";
import { useMemo } from "react";
import { MemoDeleteButton } from "../../MemoDeleteButton";
import { MemoFavoriteButton } from "../../MemoFavoriteButton";

export function MemoLocalToolbarLeft({
  anchor,
  selectedData,
  filterName,
  filter,
  onFilterChange,
  expertMode,
  onExpertModeChange,
  column2Info,
  defaultFilterExpression,
}: LocalFilterTableToolbarProps<MemoRead, MemoColumns>) {
  const selectedMemoIds = useMemo(() => selectedData.map((memo) => memo.id), [selectedData]);

  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <FilterPopover
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filter={filter}
        onFilterChange={onFilterChange}
        expertMode={expertMode}
        onExpertModeChange={onExpertModeChange}
        column2Info={column2Info}
        defaultFilterExpression={defaultFilterExpression}
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
