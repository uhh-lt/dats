import { Box, Button, Grid, Stack } from "@mui/material";
import { useState } from "react";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import CodeExplorer from "../../annotation/CodeExplorer/CodeExplorer";
import CodeTree from "./CodeTree";

const CodeGraph = () => {
  const [generate, setGenerate] = useState(false);
  const checkBoxData = useAppSelector((state) => state.checkBoxs.checkBoxes);
  const handleGenerateGraph = () => {
    setGenerate(true);
  };

  const rootNode = {
    code: { name: "root", color: "green" },
    children: checkBoxData,
  };

  const mergeData = [rootNode, ...checkBoxData];

  console.log("mergeData", mergeData);

  return (
    <Grid container columnSpacing={2} className="h100" sx={{ py: 1 }}>
      <Grid item md={3} className="h100">
        <CodeExplorer showCheckboxes={true} />
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
          {generate && mergeData.length !== 0 && <CodeTree treeData={mergeData} />}
        </div>
      </Grid>
    </Grid>
  );
};

export default CodeGraph;
