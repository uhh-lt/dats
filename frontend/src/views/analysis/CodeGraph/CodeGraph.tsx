import { Paper } from "@mui/material";
import CodeExplorer from "../../annotation/CodeExplorer/CodeExplorer";
import CodeTree from "./CodeTree";

const CodeGraph = () => {
  return (
    <Paper style={{ display: "flex", flexDirection: "row", justifyContent: "space-between" }}>
      <Paper square className="myFlexContainer" sx={{ width: 350, height: 600 }} elevation={1}>
        <CodeExplorer isCodeGraph={true} />
      </Paper>
      <div style={{ marginTop: "10%" }}>
        <CodeTree />
      </div>
    </Paper>
  );
};

export default CodeGraph;
