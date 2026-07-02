import { ContentLayout } from "@components/content-layouts";
import { SentenceAnnotationEditDialog } from "@core/sentence-annotation";
import { Box } from "@mui/material";
import { SentAnnotationAnalysisTable } from "./_components/SentAnnotationAnalysisTable";
import { SentAnnotationAnalysisRouteAPI } from "./_hooks/sentAnnotationAnalysisRouteAPI";

export function SentAnnotationAnalysisView() {
  // global client state (react router)
  const projectId = SentAnnotationAnalysisRouteAPI.useParams({ select: (params) => params.projectId });

  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <SentAnnotationAnalysisTable projectId={projectId} />
      </Box>
      <SentenceAnnotationEditDialog projectId={projectId} />
    </ContentLayout>
  );
}
