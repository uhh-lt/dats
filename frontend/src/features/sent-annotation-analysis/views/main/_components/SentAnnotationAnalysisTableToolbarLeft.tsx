import { FilterTableToolbarProps } from "@components/filter/index";
import { ReduxFilterDialog } from "@components/filter/redux-filter-dialog/index";
import { Stack } from "@mui/material";
import { SentenceAnnotationRow } from "../../../../../api/openapi/models/SentenceAnnotationRow";
import { BulkChangeSentAnnotationCodeButton } from "./BulkChangeSentAnnotationCodeButton";
import { BulkDeleteSentAnnotationsButton } from "./BulkDeleteSentAnnotationsButton";

export function SentAnnotationAnalysisTableToolbarLeft({
  anchor,
  filterName,
  filterActions,
  filterStateSelector,
  selectedData,
}: FilterTableToolbarProps<SentenceAnnotationRow>) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: "40px" }}>
      <ReduxFilterDialog
        anchorEl={anchor.current}
        buttonProps={{ size: "small" }}
        filterName={filterName}
        filterActions={filterActions}
        filterStateSelector={filterStateSelector}
      />
      <BulkChangeSentAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteSentAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
