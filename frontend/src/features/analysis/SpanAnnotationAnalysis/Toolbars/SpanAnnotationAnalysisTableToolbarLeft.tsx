import { Stack } from "@mui/material";
import { SpanAnnotationRow } from "../../../../api/openapi/models/SpanAnnotationRow.ts";
import { ReduxFilterDialog } from "../../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";
import { BulkChangeSpanAnnotationCodeButton } from "./BulkChangeSpanAnnotationCodeButton.tsx";
import { BulkDeleteSpanAnnotationsButton } from "./BulkDeleteSpanAnnotationsButton.tsx";

export function SpanAnnotationsTableToolbarLeft({
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
