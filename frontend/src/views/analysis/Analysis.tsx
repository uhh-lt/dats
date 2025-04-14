import { Box } from "@mui/material";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import AnalysisCard from "./AnalysisCard.tsx";

function Analysis() {
  return (
    <ContentContainerLayout>
      <Box display="flex" gap={2} flexWrap="wrap">
        <AnalysisCard
          to={"code-frequency"}
          title={"Code Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all codes in this project."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"timeline"}
          title={"Timeline Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"span-annotations"}
          title={"Span Annotation Table"}
          description={"View, search, edit span annotations in a table."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"sentence-annotations"}
          title={"Sentence Annotation Table"}
          description={"View, search, edit sentence annotations in a table."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"bbox-annotations"}
          title={"BBox Annotation Table"}
          description={"View, search, edit bbox annotations in a table."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"word-frequency"}
          title={"Word Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all words in this project."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"concepts-over-time-analysis"}
          title={"Concepts Over Time Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"annotation-scaling"}
          title={"Annotation Scaling"}
          description={"Semi-automatically scale annotations"}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"tag-recommendations"}
          title={"Tag Recommendations"}
          description={"Semi-automatically scale tags"}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"tag-recommendations"}
          title={"Tag Recommendations"}
          description={"Semi-automatically scale tags"}
          color={"#77dd77"}
        />

        <AnalysisCard
          to={"document-categorization"}
          title={"Document Categorization"}
          description={"Categorize documents with both LLM's and Topic Modeling"}
          color={"#77dd77"}
        />
      </Box>
    </ContentContainerLayout>
  );
}

export default Analysis;
