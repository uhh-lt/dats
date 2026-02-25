import { FilterTableToolbarProps } from "@components/filter/index";
import { ReduxFilterDialog } from "@components/filter/redux-filter-dialog/index";
import { Stack } from "@mui/material";
import { SpanAnnotationRow } from "../../../../../api/openapi/models/SpanAnnotationRow";
import { BulkChangeSpanAnnotationCodeButton } from "./BulkChangeSpanAnnotationCodeButton";
import { BulkDeleteSpanAnnotationsButton } from "./BulkDeleteSpanAnnotationsButton";

export function SpanAnnotationAnalysisTableToolbarLeft({
  anchor,
  filterName,
  filterActions,
  filterStateSelector,
  selectedData,
}: FilterTableToolbarProps<SpanAnnotationRow>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterActions={filterActions}
        filterStateSelector={filterStateSelector}
      />
      <BulkChangeSpanAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteSpanAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
