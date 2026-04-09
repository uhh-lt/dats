import { Box } from "@mui/material";
import ContentContainerLayout from "../../layouts/ContentLayouts/ContentContainerLayout.tsx";
import AnalysisCard from "./AnalysisCard.tsx";

const cardColor = "rgb(150, 200, 255)";

function Analysis() {
  return (
    <ContentContainerLayout>
      <Box display="flex" gap={2} flexWrap="wrap">
        <AnalysisCard
          to={"code-frequency"}
          title={"Code Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all codes in this project."}
          color={cardColor}
        />

        <AnalysisCard
          to={"timeline"}
          title={"Timeline Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={cardColor}
        />

        <AnalysisCard
          to={"span-annotations"}
          title={"Span Annotation Table"}
          description={"View, search, edit span annotations in a table."}
          color={cardColor}
        />

        <AnalysisCard
          to={"sentence-annotations"}
          title={"Sentence Annotation Table"}
          description={"View, search, edit sentence annotations in a table."}
          color={cardColor}
        />

        <AnalysisCard
          to={"bbox-annotations"}
          title={"Bounding-Box Annotation Table"}
          description={"View, search, edit bbox annotations in a table."}
          color={cardColor}
        />

        <AnalysisCard
          to={"word-frequency"}
          title={"Word Frequency Analysis"}
          description={"Analyse the frequencies and occurrences of all words in this project."}
          color={cardColor}
        />

        <AnalysisCard
          to={"concepts-over-time-analysis"}
          title={"Concepts Over Time Analysis"}
          description={"Analyse the occurrence of concepts over time."}
          color={cardColor}
        />

        <AnalysisCard
          to={"annotation-scaling"}
          title={"Annotation Scaling"}
          description={"Semi-automatically scale annotations"}
          color={cardColor}
        />

        <AnalysisCard
          to={"tag-recommendations"}
          title={"Tag Recommendations"}
          description={"Semi-automatically scale tags"}
          color={cardColor}
        />
      </Box>
    </ContentContainerLayout>
  );
}

export default Analysis;
