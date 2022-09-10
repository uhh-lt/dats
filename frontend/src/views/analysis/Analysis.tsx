import React from "react";
import { Box, Container, Grid } from "@mui/material";
import AnalysisCard from "./AnalysisCard";
import { range } from "lodash";

function Analysis() {
  return (
    <Box className="h100" style={{ overflowY: "auto" }}>
      <Container maxWidth="lg" className="h100">
        <Grid container spacing={2} mt={0}>
          {range(0, 30).map((i) => (
            <Grid item key={i}>
              <AnalysisCard />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default Analysis;
