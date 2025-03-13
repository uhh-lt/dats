import { Box, Grid2 } from "@mui/material";
import WordFrequencyTable from "./WordFrequencyTable.tsx";

function WordFrequency() {
  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Grid2 container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid2 size={{ md: 12 }} className="myFlexContainer h100">
          <WordFrequencyTable />
        </Grid2>
      </Grid2>
    </Box>
  );
}

export default WordFrequency;
