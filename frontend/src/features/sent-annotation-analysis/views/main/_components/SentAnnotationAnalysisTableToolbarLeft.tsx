import { SentenceAnnotationRow } from "@api/models/SentenceAnnotationRow";
import { URLFilterDialog, URLFilterTableToolbarProps } from "@core/filter";
import { Stack } from "@mui/material";
import { BulkChangeSentAnnotationCodeButton } from "./BulkChangeSentAnnotationCodeButton";
import { BulkDeleteSentAnnotationsButton } from "./BulkDeleteSentAnnotationsButton";

export function SentAnnotationAnalysisTableToolbarLeft({
  anchor,
  filterName,
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
  selectedData,
}: URLFilterTableToolbarProps<SentenceAnnotationRow>) {
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
      <BulkChangeSentAnnotationCodeButton selectedData={selectedData} />
      <BulkDeleteSentAnnotationsButton selectedData={selectedData} />
    </Stack>
  );
}
