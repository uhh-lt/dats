import { FilterDialog, LocalFilterTableToolbarProps } from "@core/filter";
import { BBoxAnnotationRow } from "@models/BBoxAnnotationRow";
import { BBoxColumns } from "@models/BBoxColumns";
import { Stack } from "@mui/material";
import { BulkChangeBBoxAnnotationCodeButton } from "./BulkChangeBBoxAnnotationCodeButton";
import { BulkDeleteBBoxAnnotationsButton } from "./BulkDeleteBBoxAnnotationsButton";

export function BBoxAnnotationAnalysisTableToolbarLeft({
  anchor,
  selectedData,
  //
  filterName,
  defaultFilterExpression,
  filter,
  onFilterChange,
  expertMode,
  onExpertModeChange,
  column2Info,
}: LocalFilterTableToolbarProps<BBoxAnnotationRow, BBoxColumns>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <FilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        defaultFilterExpression={defaultFilterExpression}
        filter={filter}
        onFilterChange={onFilterChange}
        expertMode={expertMode}
        onExpertModeChange={onExpertModeChange}
        column2Info={column2Info}
      />
      <BulkChangeBBoxAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteBBoxAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
