import { ContentLayout } from "@components/content-layouts";
import { SpanAnnotationEditDialog } from "@core/span-annotation";
import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { SpanAnnotationAnalysisTable } from "./_components/SpanAnnotationAnalysisTable";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/span-annotations");

export function SpanAnnotationAnalysisView() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SpanAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <SpanAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
