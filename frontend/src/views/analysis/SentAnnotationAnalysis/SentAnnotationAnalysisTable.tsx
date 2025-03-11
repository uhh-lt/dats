import { useParams } from "react-router-dom";

import { Stack } from "@mui/material";
import SentenceAnnotationTable, {
  SentenceAnnotationTableProps,
} from "../../../components/SentenceAnnotation/SentenceAnnotationTable/SentenceAnnotationTable.tsx";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import BulkChangeSentAnnotationCodeButton from "./BulkChangeSentAnnotationCodeButton.tsx";
import BulkDeleteSentAnnotationsButton from "./BulkDeleteSentAnnotationsButton.tsx";
import { SentAnnotationsActions } from "./sentAnnotationAnalysisSlice.ts";
import SentAnnotationAnalysisTableToolbar from "./SentAnnotationAnalysisTableToolbar.tsx";

const filterName = "sentAnnotationAnalysisTable";
interface SentAnnotationAnalysisTableProps {
  cardProps: SentenceAnnotationTableProps["cardProps"];
}

function SentAnnotationAnalysisTable({ cardProps }: SentAnnotationAnalysisTableProps) {
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  // global client state (redux) connected to table state
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.rowSelectionModel,
    SentAnnotationsActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.sortingModel,
    SentAnnotationsActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.sentAnnotationAnalysis.columnVisibilityModel,
    SentAnnotationsActions.onColumnVisibilityChange,
  );

  return (
    <SentenceAnnotationTable
      projectId={projectId}
      filterName={filterName}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={setRowSelectionModel}
      sortingModel={sortingModel}
      onSortingChange={setSortingModel}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={setColumnVisibilityModel}
      renderTopToolbarCustomActions={(props) => (
        <Stack direction="row" spacing={1}>
          <BulkChangeSentAnnotationCodeButton {...props} />
          <BulkDeleteSentAnnotationsButton {...props} />
        </Stack>
      )}
      renderToolbarInternalActions={SentAnnotationAnalysisTableToolbar}
      cardProps={cardProps}
      positionToolbarAlertBanner="head-overlay"
    />
  );
}

export default SentAnnotationAnalysisTable;
