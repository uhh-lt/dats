import { Box, Button, Grid, Stack } from "@mui/material";
import { useRef, useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CodeExplorer, { CodeExplorerHandle } from "../../annotation/CodeExplorer/CodeExplorer";
import ICodeTree from "../../annotation/CodeExplorer/ICodeTree";
import CodeTree from "./CodeTree";
import useComputeCodeTree from "./useComputeCodeTree";

const CodeGraph = () => {
  // local state
  const codeExplorerRef = useRef<CodeExplorerHandle>(null);
  const [graphData, setGraphData] = useState<ICodeTree[] | undefined>(undefined);

  // custom hooks
  const { codeTree, codes } = useComputeCodeTree();

  console.log("codeTree", codeTree);
  console.log("codes", codes);

  const handleGenerateGraph = () => {
    if (!codeExplorerRef.current) return;

    const checkedCodeIds = codeExplorerRef.current.getCheckedCodeIds();
    console.log("checkedCodeIds", checkedCodeIds);
    if (checkedCodeIds.length > 0) {
      // TODO: use the code ids to construct the graph data here
      const nodeA: ICodeTree = {
        code: {
          name: "a",
          color: "green",
          created: "",
          description: "",
          id: 1,
          project_id: 1,
          updated: "",
          user_id: 1,
          parent_code_id: -1,
        },
        children: [],
      };

      const nodeB: ICodeTree = {
        code: {
          name: "b",
          color: "green",
          created: "",
          description: "",
          id: 2,
          project_id: 1,
          updated: "",
          user_id: 1,
          parent_code_id: -1,
        },
        children: [
          {
            code: {
              name: "c",
              color: "green",
              created: "",
              description: "",
              id: 3,
              project_id: 1,
              updated: "",
              user_id: 1,
              parent_code_id: 2,
            },
            children: [],
          },
          {
            code: {
              name: "d",
              color: "green",
              created: "",
              description: "",
              id: 4,
              project_id: 1,
              updated: "",
              user_id: 1,
              parent_code_id: 2,
            },
            children: [],
          },
          {
            code: {
              name: "e",
              color: "green",
              created: "",
              description: "",
              id: 5,
              project_id: 1,
              updated: "",
              user_id: 1,
              parent_code_id: 3,
            },
            children: [],
          },
        ],
      };

      // please do not use a single root node, lets use a graph (e.g. force directed graph) to display the data
      // the graph would not need a single *artificial* root node
      setGraphData([nodeA, nodeB]);
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
        <div className="myFlexFillAllContainer">{graphData && <CodeTree treeData={graphData} />}</div>
      </Grid>
    </Grid>
  );
};

export default CodeGraph;
