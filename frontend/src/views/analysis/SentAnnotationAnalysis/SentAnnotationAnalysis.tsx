import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import SentenceAnnotationEditDialog from "../../../components/SentenceAnnotation/SentenceAnnotationEditDialog.tsx";
import ContentLayout from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import SentAnnotationAnalysisTable from "./SentAnnotationAnalysisTable.tsx";

function SentAnnotationAnalysis() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SentAnnotationAnalysisTable />
      </Box>
      <SentenceAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}

export default SentAnnotationAnalysis;
