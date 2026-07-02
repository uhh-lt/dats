import { FilterDialog, LocalFilterTableToolbarProps } from "@core/filter";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { SentenceAnnotationRow } from "@models/SentenceAnnotationRow";
import { Stack } from "@mui/material";
import { BulkChangeSentAnnotationCodeButton } from "./BulkChangeSentAnnotationCodeButton";
import { BulkDeleteSentAnnotationsButton } from "./BulkDeleteSentAnnotationsButton";

export function SentAnnotationAnalysisTableToolbarLeft({
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
}: LocalFilterTableToolbarProps<SentenceAnnotationRow, SentAnnoColumns>) {
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
      <BulkChangeSentAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteSentAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
