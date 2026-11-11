import { ContentContainerLayout } from "@components/content-layouts";
import { Icon } from "@components/icons";
import { LinkCard, useEnabledNavigationEntries } from "@core/navigation";
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

function AnalysisView() {
  const projectId = Route.useParams({ select: (params) => params.projectId });
  const entries = useEnabledNavigationEntries("analysis");

  return (
    <ContentContainerLayout>
      <Box display="flex" gap={2} flexWrap="wrap">
        {entries.map((entry) => (
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
