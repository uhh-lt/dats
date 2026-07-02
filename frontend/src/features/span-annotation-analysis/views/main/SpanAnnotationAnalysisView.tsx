import { ContentLayout } from "@components/content-layouts";
import { SpanAnnotationEditDialog } from "@core/span-annotation";
import { Box } from "@mui/material";
import { SpanAnnotationAnalysisTable } from "./_components/SpanAnnotationAnalysisTable";
import { SpanAnnotationAnalysisRouteAPI } from "./_hooks/spanAnnotationAnalysisRouteAPI";

export function SpanAnnotationAnalysisView() {
  // global client state (react router)
  const projectId = SpanAnnotationAnalysisRouteAPI.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SpanAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <SpanAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
