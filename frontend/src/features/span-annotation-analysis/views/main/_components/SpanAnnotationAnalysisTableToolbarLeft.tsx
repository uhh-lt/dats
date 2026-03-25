import { SpanAnnotationRow } from "@api/models/SpanAnnotationRow";
import { SpanColumns } from "@api/models/SpanColumns";
import { FilterDialog, LocalFilterTableToolbarProps } from "@core/filter";
import { Stack } from "@mui/material";
import { BulkChangeSpanAnnotationCodeButton } from "./BulkChangeSpanAnnotationCodeButton";
import { BulkDeleteSpanAnnotationsButton } from "./BulkDeleteSpanAnnotationsButton";

export function SpanAnnotationAnalysisTableToolbarLeft({
  anchor,
  //
  filterName,
  defaultFilterExpression,
  filter,
  onFilterChange,
  expertMode,
  onExpertModeChange,
  column2Info,
  selectedData,
}: LocalFilterTableToolbarProps<SpanAnnotationRow, SpanColumns>) {
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
      <BulkChangeSpanAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteSpanAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
