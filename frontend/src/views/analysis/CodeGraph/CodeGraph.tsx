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
  const [graphData, setGraphData] = useState<ICodeTree[] | undefined>(undefined);

  // custom hooks
  const { codeTree, codes } = useComputeCodeTree();
  const [matchedData, setMatchedData] = useState([]);

  console.log("codeTree", codeTree);
  console.log("codes", codes.data);

  function handleMatchData(ids: ArrayId[], data: ICodeTree) {
    const matched: ICodeTree[] = [];

    data.forEach((arr) => {
      if (Array.isArray(arr)) {
        const objs = [];
        arr.forEach((obj) => {
          if (ids.includes(obj.id)) {
            objs.push(obj);
          }
        });

        if (objs.length > 0) {
          // Group objects by parent_code_id
          const groupedObjs = objs.reduce((acc, curr) => {
            const key = curr.parent_code_id;
            if (!acc[key]) {
              acc[key] = [];
            }
            acc[key].push(curr);
            return acc;
          }, {});

          // Push grouped objects to matched array
          Object.values(groupedObjs).forEach((group) => {
            matched.push(group);
          });
        }
      } else {
        if (ids.includes(arr.id)) {
          matched.push([arr]);
        }
      }
    });

    const grouped = matched.reduce((groups, arr) => {
      if (Array.isArray(arr)) {
        arr.forEach((obj) => {
          const key = obj.parent_code_id !== null && obj.parent_code_id !== undefined ? obj.parent_code_id : obj.id;
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(obj);
        });
      } else {
        const obj = arr;
        const key = obj.parent_code_id !== null && obj.parent_code_id !== undefined ? obj.parent_code_id : obj.id;
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(obj);
      }
      return groups;
    }, {});

    const groupedArray: SetSt = Object.values(grouped);

    setMatchedData(groupedArray);
    return groupedArray;
  }

  const handleGenerateGraph = () => {
    if (!codeExplorerRef.current) return;

    const checkedCodeIds = codeExplorerRef.current.getCheckedCodeIds();
    console.log("checkedCodeIds", checkedCodeIds);
    if (checkedCodeIds.length > 0) {
      setGraphData(handleMatchData(checkedCodeIds, codes.data));
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
        <div className="myFlexFillAllContainer">{graphData !== undefined && <ForceLayout data={graphData} />}</div>
      </Grid>
    </Grid>
  );
};

export default CodeGraph;
