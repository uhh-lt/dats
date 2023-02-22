import React, { useContext } from "react";
import { Box, Container, Grid, Portal, Typography } from "@mui/material";
import AnalysisCard from "./AnalysisCard";
import { range } from "lodash";
import { AppBarContext } from "../../layouts/TwoBarLayout";

function Analysis() {
  // global client state (context)
  const appBarContainerRef = useContext(AppBarContext);

  return (
    <>
      <Portal container={appBarContainerRef?.current}>
        <Typography variant="h6" color="inherit" component="div">
          Analysis
        </Typography>
      </Portal>
      <Box className="h100" style={{ overflowY: "auto" }}>
        <Container maxWidth="lg" className="h100">
          <Grid container spacing={2} mt={0}>
            <Grid item>
              <AnalysisCard
                to={"frequency"}
                title={"Frequency Analysis"}
                description={"Analyse the frequencies and occurrences of all codes in this project."}
                color={"#77dd77"}
              />
            </Grid>
            {range(0, 4).map((i) => (
              <Grid item key={i}>
                <AnalysisCard
                  to={""}
                  title={"Mock Analysis Feature"}
                  description="This Analysis Feature does not actually exist..."
                />
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}

export default Analysis;