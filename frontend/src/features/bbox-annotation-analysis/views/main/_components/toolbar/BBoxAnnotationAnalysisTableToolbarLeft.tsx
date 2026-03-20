import { BBoxAnnotationRow } from "@api/models/BBoxAnnotationRow";
import { URLFilterDialog, URLFilterTableToolbarProps } from "@core/filter";
import { Stack } from "@mui/material";
import { BulkChangeBBoxAnnotationCodeButton } from "./BulkChangeBBoxAnnotationCodeButton";
import { BulkDeleteBBoxAnnotationsButton } from "./BulkDeleteBBoxAnnotationsButton";

export function BBoxAnnotationAnalysisTableToolbarLeft({
  anchor,
  filterName,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
  filterSearchParam,
  expertModeSearchParam,
  selectedData,
}: URLFilterTableToolbarProps<BBoxAnnotationRow>) {
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
      <BulkChangeBBoxAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteBBoxAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
