import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import BBoxAnnotationEditDialog from "../../../components/BBoxAnnotation/BBoxAnnotationEditDialog.tsx";
import ContentLayout from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import BBoxAnnotationAnalysisTable from "./BBoxAnnotationAnalysisTable.tsx";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/bbox-annotations");

function BBoxAnnotationAnalysis() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <BBoxAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <BBoxAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}

export default BBoxAnnotationAnalysis;
