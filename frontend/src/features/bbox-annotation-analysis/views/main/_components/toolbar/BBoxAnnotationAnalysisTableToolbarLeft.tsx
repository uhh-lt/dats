import { BBoxAnnotationRow } from "@api/models/BBoxAnnotationRow";
import { FilterTableToolbarProps, ReduxFilterDialog } from "@core/filter";
import { Stack } from "@mui/material";
import { BulkChangeBBoxAnnotationCodeButton } from "./BulkChangeBBoxAnnotationCodeButton";
import { BulkDeleteBBoxAnnotationsButton } from "./BulkDeleteBBoxAnnotationsButton";

export function BBoxAnnotationAnalysisTableToolbarLeft({
  anchor,
  filterName,
  filterActions,
  filterStateSelector,
  selectedData,
}: FilterTableToolbarProps<BBoxAnnotationRow>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterActions={filterActions}
        filterStateSelector={filterStateSelector}
      />
      <BulkChangeBBoxAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteBBoxAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
