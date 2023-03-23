// @ts-nocheck comment
import { Box, Button, Grid, Stack } from "@mui/material";
import { useRef, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CodeExplorer, { CodeExplorerHandle } from "../../annotation/CodeExplorer/CodeExplorer";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import ForceLayout from "./ForceLayout";

import useComputeCodeTree from "./useComputeCodeTree";

export interface ArrayId {
  id: number[];
}

const CodeGraph = () => {
  // local state
  const codeExplorerRef = useRef<CodeExplorerHandle>(null);
  const [graphData, setGraphData] = useState({});

  // custom hooks
  const { codeTree, codes } = useComputeCodeTree();
  const [matchedData, setMatchedData] = useState([]);

  console.log("codeTree", codeTree);
  console.log("codes", codes.data);

  function handleMatchData(selectedIds: number[], data: any[]) {
    // find all selected codes in the data based on selectedIds
    const nodes = data.filter((code) => selectedIds.includes(code.id));

    // there is a link between two selected codes if the parent_code_id of the child code is the id of the parent code
    const links = [];
    nodes.forEach((node) => {
      // the link is directional and starts from the parent code to the child code
      if (
        node.parent_code_id !== null &&
        node.parent_code_id !== undefined &&
        selectedIds.includes(node.parent_code_id)
      ) {
        links.push({ source: node.parent_code_id, target: node.id });
      }
    });

    return { nodes, links };
  }

  const handleGenerateGraph = () => {
    if (!codeExplorerRef.current) return;

    const checkedCodeIds = codeExplorerRef.current.getCheckedCodeIds();
    console.log("checkedCodeIds", checkedCodeIds);
    if (checkedCodeIds.length > 0) {
      console.log("handleMatchData", handleMatchData(checkedCodeIds, codes.data));
      setGraphData(handleMatchData(checkedCodeIds, codes.data));
      console.log("graphData", graphData);
    } else {
      setGraphData(undefined);
    }
  };

  return (
    <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
      <Grid item md={3} className="h100">
        <CodeExplorer showCheckboxes={true} ref={codeExplorerRef} />
      </Grid>
      <Grid item md={9} className="myFlexContainer h100">
        <Box className="myFlexFitContent">
          <Stack direction="row" style={{ flexWrap: "wrap", gap: "8px" }}>
            <Button
              variant="contained"
              onClick={handleGenerateGraph}
              sx={{ width: "50%", marginTop: "20px", float: "right" }}
            >
              Generate
            </Button>
          </Stack>
        </Box>
        <div className="myFlexFillAllContainer">
          {(graphData !== undefined || graphData !== null) && <ForceLayout data={graphData} />}
        </div>
      </Grid>
    </Grid>
  );
};

export default CodeGraph;
