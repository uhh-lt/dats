import { Paper } from "@mui/material";
import React from "react";
import CodeExplorer from "../../annotation/CodeExplorer/CodeExplorer";

const CodeGraph = () => {
  return (
    <Paper square className="myFlexContainer h100" sx={{ width: 350 }} elevation={1}>
      <CodeExplorer isCodeGraph={true} />
    </Paper>
  );
};

export default CodeGraph;
