import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import SpanAnnotationEditDialog from "../../../components/SpanAnnotation/SpanAnnotationEditDialog.tsx";
import ContentLayout from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import SpanAnnotationAnalysisTable from "./SpanAnnotationAnalysisTable.tsx";

function SpanAnnotationAnalysis() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SpanAnnotationAnalysisTable />
      </Box>
      <SpanAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}

export default SpanAnnotationAnalysis;
