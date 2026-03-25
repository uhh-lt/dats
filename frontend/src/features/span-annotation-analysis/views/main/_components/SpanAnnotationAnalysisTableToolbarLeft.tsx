import { SpanAnnotationRow } from "@api/models/SpanAnnotationRow";
import { URLFilterDialog, URLFilterTableToolbarProps } from "@core/filter";
import { Stack } from "@mui/material";
import { BulkChangeSpanAnnotationCodeButton } from "./BulkChangeSpanAnnotationCodeButton";
import { BulkDeleteSpanAnnotationsButton } from "./BulkDeleteSpanAnnotationsButton";

export function SpanAnnotationAnalysisTableToolbarLeft({
  anchor,
  filterName,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
  selectedData,
}: URLFilterTableToolbarProps<SpanAnnotationRow>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <URLFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        routeApi={routeApi}
        defaultFilterExpression={defaultFilterExpression}
        column2InfoSelector={column2InfoSelector}
      />
      <BulkChangeSpanAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteSpanAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
