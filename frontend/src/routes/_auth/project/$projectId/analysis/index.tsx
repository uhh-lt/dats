import { Box } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import LinkCard from "../../../../../components/MUI/LinkCard.tsx";
import ContentContainerLayout from "../../../../../layouts/ContentLayouts/ContentContainerLayout.tsx";

export const Route = createFileRoute("/_auth/project/$projectId/analysis/")({
  component: Analysis,
});

function Analysis() {
  const projectId = Route.useParams({ select: (params) => params.projectId });

  return (
    <ContentContainerLayout>
      <Box display="flex" gap={2} flexWrap="wrap">
        <LinkCard
          to="/project/$projectId/analysis/code-frequency"
          params={{ projectId }}
          title={"Code Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all codes in this project."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/timeline"
          params={{ projectId }}
          title={"Timeline Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/span-annotations"
          params={{ projectId }}
          title={"Span Annotation Table"}
          description={"View, search, edit span annotations in a table."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/span-annotations"
          params={{ projectId }}
          title={"Sentence Annotation Table"}
          description={"View, search, edit sentence annotations in a table."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/span-annotations"
          params={{ projectId }}
          title={"BBox Annotation Table"}
          description={"View, search, edit bbox annotations in a table."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/word-frequency"
          params={{ projectId }}
          title={"Word Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all words in this project."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/concepts-over-time-analysis"
          params={{ projectId }}
          title={"Concepts Over Time Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/annotation-scaling"
          params={{ projectId }}
          title={"Annotation Scaling"}
          description={"Semi-automatically scale annotations"}
          color={"#77dd77"}
        />
        <LinkCard
          to="/project/$projectId/analysis/tag-recommendations"
          params={{ projectId }}
          title={"Tag Recommendations"}
          description={"Semi-automatically scale tags"}
          color={"#77dd77"}
        />
      </Box>
    </ContentContainerLayout>
  );
}
