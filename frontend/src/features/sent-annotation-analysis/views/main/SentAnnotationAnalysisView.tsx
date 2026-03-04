import { ContentLayout } from "@components/content-layouts";
import { SentenceAnnotationEditDialog } from "@core/sentence-annotation/dialog/SentenceAnnotationEditDialog";
import { Box } from "@mui/material";
import { getRouteApi } from "@tanstack/react-router";
import { SentAnnotationAnalysisTable } from "./_components/SentAnnotationAnalysisTable";

const routeApi = getRouteApi("/_auth/project/$projectId/analysis/sentence-annotations");

export function SentAnnotationAnalysisView() {
  // global client state (react router)
  const projectId = routeApi.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SentAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <SentenceAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
