import { Box, Button, Grid, Stack } from "@mui/material";
import { useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI.ts";
import CodeExplorer from "../../annotation/CodeExplorer/CodeExplorer.tsx";
import ForceLayout, { GraphData, LinkData } from "./ForceLayout.tsx";

function generateGraphData(selectedIds: number[], allCodes: CodeRead[]): GraphData {
  // find all selected codes in the data based on selectedIds
  const nodes = allCodes.filter((code) => selectedIds.includes(code.id));

  // there is a link between two selected codes if the parent_id of the child code is the id of the parent code
  const links: LinkData[] = [];
  nodes.forEach((node) => {
    // the link is directional and starts from the parent code to the child code
    if (node.parent_id !== null && node.parent_id !== undefined && selectedIds.includes(node.parent_id)) {
      links.push({ source: node.parent_id, target: node.id });
    }
  });

  return { nodes, links };
}

export interface ArrayId {
  id: number[];
}

const CodeGraph = () => {
  const { projectId } = useParams() as { projectId: string };
  const projId = parseInt(projectId);

  // global server state (react-query)
  const codes = ProjectHooks.useGetAllCodes(projId);

  // local state
  const [graphData, setGraphData] = useState<GraphData | undefined>(undefined);

  const handleGenerateGraph = () => {
    if (!codes.isSuccess) return;

    // get the selected codes from the code explorer
    const checkedCodeIds: number[] = [];

    // ensure that at least one code is checked
    if (checkedCodeIds.length === 0) {
      SnackbarAPI.openSnackbar({
        text: "Please select at least one code to generate the graph.",
        severity: "warning",
      });
      return;
    }

    // generate the graph data
    setGraphData(generateGraphData(checkedCodeIds, codes.data));
  };

  return (
    <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
      <Grid item md={3} className="h100">
        <CodeExplorer />
      </Grid>
      <Grid item md={9} className="myFlexContainer h100">
        <Box className="myFlexFitContent">
          <Stack direction="row" style={{ flexWrap: "wrap", gap: "8px" }}>
            <Button
              disabled={codes.isLoading || codes.isError}
              variant="contained"
              onClick={handleGenerateGraph}
              sx={{ width: "50%", marginTop: "20px", float: "right" }}
            >
              Generate
            </Button>
          </Stack>
        </Box>
        <div className="myFlexFillAllContainer">
          {graphData && <ForceLayout data={graphData} width={800} height={600} key={JSON.stringify(graphData.links)} />}
        </div>
      </Grid>
    </Grid>
  );
};

export default CodeGraph;
