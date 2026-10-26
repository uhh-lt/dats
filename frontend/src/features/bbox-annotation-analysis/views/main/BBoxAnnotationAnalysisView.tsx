import { ContentLayout } from "@components/content-layouts";
import { Box } from "@mui/material";
import { BBoxAnnotationAnalysisTable } from "./_components/BBoxAnnotationAnalysisTable";
import { BBoxAnnotationAnalysisRouteAPI } from "./_hooks/bboxAnnotationAnalysisRouteAPI";

export function BBoxAnnotationAnalysisView() {
  // global client state (react router)
  const projectId = BBoxAnnotationAnalysisRouteAPI.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <BBoxAnnotationAnalysisTable projectId={projectId} />
      </Box>
    </ContentLayout>
  );
}
