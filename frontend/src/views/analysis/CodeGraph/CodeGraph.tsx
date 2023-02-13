import { Paper } from "@mui/material";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CodeExplorer from "../../annotation/CodeExplorer/CodeExplorer";
import CodeTree from "./CodeTree";

const CodeGraph = () => {
  const treeData = useAppSelector((state) => state.codeGraph.codesGraphSelection);

  return (
    <Paper style={{ display: "flex" }}>
      <Paper square className="myFlexContainer" sx={{ width: 350, height: 600 }} elevation={1}>
        <CodeExplorer isCodeGraph={true} />
      </Paper>
      {treeData.length !== 0 && (
        <div style={{ width: "100vw", height: "100vh", overflow: "auto" }}>
          <CodeTree />
        </div>
      )}
    </Paper>
  );
};

export default CodeGraph;
