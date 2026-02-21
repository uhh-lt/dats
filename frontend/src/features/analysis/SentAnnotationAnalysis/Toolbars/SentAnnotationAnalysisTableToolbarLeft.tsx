import { Stack } from "@mui/material";
import { SentenceAnnotationRow } from "../../../../api/openapi/models/SentenceAnnotationRow.ts";
import { ReduxFilterDialog } from "../../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { FilterTableToolbarProps } from "../../../../components/FilterTable/FilterTableToolbarProps.ts";
import { BulkChangeSentAnnotationCodeButton } from "./BulkChangeSentAnnotationCodeButton.tsx";
import { BulkDeleteSentAnnotationsButton } from "./BulkDeleteSentAnnotationsButton.tsx";

export function SentAnnotationsTableToolbarLeft({
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
