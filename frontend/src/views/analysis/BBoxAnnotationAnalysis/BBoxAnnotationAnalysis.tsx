import { Box } from "@mui/material";
import { useParams } from "react-router-dom";
import BBoxAnnotationEditDialog from "../../../components/BBoxAnnotation/BBoxAnnotationEditDialog.tsx";
import ContentLayout from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import BBoxAnnotationAnalysisTable from "./BBoxAnnotationAnalysisTable.tsx";

function BBoxAnnotationAnalysis() {
  // global client state (react router)
  const projectId = parseInt(useParams<{ projectId: string }>().projectId!);

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <BBoxAnnotationAnalysisTable />
      </Box>
      <BBoxAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}

export default BBoxAnnotationAnalysis;
