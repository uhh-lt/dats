import React from "react";
import { AppBar, Grid, Toolbar, Typography } from "@mui/material";
import DocumentExplorer from "../../features/document-explorer/DocumentExplorer";

function Analysis() {
  return (
    <Grid container columnSpacing={2} className="h100">
      <Grid item md={3} className="h100">
        <DocumentExplorer />
      </Grid>
      <Grid item md={9}>
        <AppBar position="relative" color="secondary" sx={{ paddingRight: 0 }}>
          <Toolbar variant="dense" sx={{ paddingRight: 0 }}>
            <Typography variant="h6" color="inherit" component="div">
              Analysis
            </Typography>
          </Toolbar>
        </AppBar>
      </Grid>
    </Grid>
  );
}

export default Analysis;
