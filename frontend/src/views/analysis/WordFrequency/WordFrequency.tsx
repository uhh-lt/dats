import { Box } from "@mui/material";
import ContentLayout from "../../../layouts/ContentLayouts/ContentLayout.tsx";
import WordFrequencyTable from "./WordFrequencyTable.tsx";

function WordFrequency() {
  return (
    <ContentLayout>
      <Box className="myFlexContainer h100">
        <WordFrequencyTable />
      </Box>
    </ContentLayout>
  );
}

export default WordFrequency;
