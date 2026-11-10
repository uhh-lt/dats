import { ContentContainerLayout } from "@components/content-layouts";
import { Icon } from "@components/icons";
import { getFeatureEntries, useIsFeatureEnabled } from "@core/feature";
import { LinkCard } from "@core/navigation";
import { Box } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/")({
  staticData: {
    tab: true,
    icon: Icon.ANALYSIS,
    getTitle: () => "Analysis",
  },
  component: AnalysisView,
});

const cardColor = "rgb(150, 200, 255)";
const ANALYSIS_ENTRIES = getFeatureEntries("analysis");

function AnalysisView() {
  const projectId = Route.useParams({ select: (params) => params.projectId });
  const isFeatureEnabled = useIsFeatureEnabled();

  return (
    <ContentContainerLayout>
      <Box display="flex" gap={2} flexWrap="wrap">
        {ANALYSIS_ENTRIES.filter((entry) => isFeatureEnabled(entry.feature)).map((entry) => (
          <LinkCard
            key={entry.id}
            to={entry.to}
            params={{ projectId }}
            title={entry.title}
            description={entry.description ?? ""}
            color={cardColor}
          />
        ))}
      </Box>
    </ContentContainerLayout>
  );
}
