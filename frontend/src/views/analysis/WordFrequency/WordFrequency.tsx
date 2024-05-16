import { Box, Grid, Portal, Typography } from "@mui/material";
import { useContext } from "react";
import { AppBarContext } from "../../../layouts/TwoBarLayout.tsx";
import WordFrequencyTable from "./WordFrequencyTable.tsx";

function WordFrequency() {
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <Box bgcolor={"grey.200"} className="h100">
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Word Frequencies
        </Typography>
      </Portal>
      <Grid container className="h100" columnSpacing={2} padding={2} bgcolor={"grey.200"}>
        <Grid item md={12} className="myFlexContainer h100">
          <WordFrequencyTable />
        </Grid>
      </Grid>
    </Box>
  );
}

export default WordFrequency;
