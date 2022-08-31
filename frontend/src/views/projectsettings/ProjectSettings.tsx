import React from "react";
import { Container, Grid } from "@mui/material";
import { Outlet } from "react-router-dom";
import ProjectSelection from "./ProjectSelection";

function ProjectSettings() {
  return (
    <Container maxWidth="xl" className="h100">
      <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
        <Grid item xs={4} className="h100">
          <ProjectSelection />
        </Grid>
        <Grid item xs={8} className="h100">
          <Outlet />
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProjectSettings;
