import React from "react";
import { Container, Grid } from "@mui/material";
import { Outlet } from "react-router-dom";
import ProjectSelection from "./ProjectSelection";

function ProjectUpdate() {
  return (
    <Container maxWidth="xl">
      <Grid container spacing={2}>
        <Grid item xs={4}>
          <ProjectSelection />
        </Grid>
        <Grid item xs={8}>
          <Outlet />
        </Grid>
      </Grid>
    </Container>
  );
}

export default ProjectUpdate;
